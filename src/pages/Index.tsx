import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Clock, Scissors, Phone, MapPin, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price: number;
}

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  client_email: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string;
  services_2025_12_05_15_37: Service;
}

const Index = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedService, setSelectedService] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState<string>('');
  const [clientPhone, setClientPhone] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showBooking, setShowBooking] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  
  // CORREGIDO: Horario de 9:00 AM a 7:00 PM (horas en punto)
  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', 
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
  ];

  useEffect(() => {
    fetchServices();
    fetchAppointments();

    // --- REALTIME: Escuchar cambios en la base de datos ---
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar Insert, Update y Delete
          schema: 'public',
          table: 'appointments_2025_12_05_15_37'
        },
        (payload) => {
          console.log('Cambio detectado en tiempo real:', payload);
          fetchAppointments();
          // Si hay una fecha seleccionada, actualizar también los slots ocupados
          if (selectedDate) {
             // Pequeño delay para asegurar que la base de datos procesó el cambio
             setTimeout(() => fetchOccupiedSlots(selectedDate).then(setOccupiedSlots), 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDate]); // Se vuelve a ejecutar si cambia la fecha seleccionada para asegurar consistencia

  const fetchServices = async () => {
    const { data, error } = await supabase.from('services_2025_12_05_15_37').select('*').eq('active', true).order('price');
    if (error) {
      toast.error('Error al cargar servicios');
    } else {
      setServices(data || []);
    }
  };

  const fetchAppointments = async () => {
    const { data, error } = await supabase.from('appointments_2025_12_05_15_37').select(`
        *,
        services_2025_12_05_15_37 (name, price, duration_minutes)
      `).in('status', ['pending', 'confirmed']).order('appointment_date').order('appointment_time');
    if (error) {
      console.error('Error al cargar citas:', error);
    } else {
      setAppointments(data || []);
    }
  };

  // Función corregida para calcular bloques ocupados
  const fetchOccupiedSlots = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data, error } = await supabase.from('appointments_2025_12_05_15_37').select('appointment_time, services_2025_12_05_15_37(duration_minutes)').eq('appointment_date', dateStr).in('status', ['pending', 'confirmed']);
    if (error) {
      console.error('Error al cargar horarios ocupados:', error);
      return [];
    }

    const occupied: string[] = [];
    data?.forEach(appointment => {
      const startTime = appointment.appointment_time; // Ej: "14:00"
      const duration = appointment.services_2025_12_05_15_37?.duration_minutes || 30; // Ej: 60 min

      // Convertir hora inicio a minutos
      const [hours, minutes] = startTime.split(':').map(Number);
      const startTotalMinutes = hours * 60 + minutes;
      const endTotalMinutes = startTotalMinutes + duration; // Ej: 14:00 (840m) + 60m = 15:00 (900m)

      // Recorrer nuestros slots y ver cuáles caen dentro de este rango ocupado
      timeSlots.forEach(slot => {
         const [h, m] = slot.split(':').map(Number);
         const slotMinutes = h * 60 + m;

         // Si el slot es igual al inicio o está entre medio del servicio, se bloquea
         // Nota: < endTotalMinutes asegura que si termina a las 15:00, el slot de las 15:00 quede libre
         if (slotMinutes >= startTotalMinutes && slotMinutes < endTotalMinutes) {
            occupied.push(slot);
         }
      });
    });
    return [...new Set(occupied)];
  };

  useEffect(() => {
    if (selectedDate) {
      fetchOccupiedSlots(selectedDate).then(setOccupiedSlots);
    }
  }, [selectedDate]);

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime || !selectedService || !clientName || !clientPhone) {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    if (occupiedSlots.includes(selectedTime)) {
      toast.error('Este horario ya está ocupado.');
      return;
    }
    setLoading(true);

    const { data: existingAppointment } = await supabase.from('appointments_2025_12_05_15_37').select('id').eq('appointment_date', format(selectedDate, 'yyyy-MM-dd')).eq('appointment_time', selectedTime).in('status', ['pending', 'confirmed']).single();
    if (existingAppointment) {
      setLoading(false);
      toast.error('Este horario ya fue reservado.');
      fetchOccupiedSlots(selectedDate).then(setOccupiedSlots);
      return;
    }
    const { error } = await supabase.from('appointments_2025_12_05_15_37').insert({
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      service_id: selectedService,
      appointment_date: format(selectedDate, 'yyyy-MM-dd'),
      appointment_time: selectedTime,
      notes: notes,
      status: 'pending'
    });
    setLoading(false);
    if (error) {
      toast.error('Error al reservar la cita');
    } else {
      toast.success('¡Cita reservada exitosamente!');
      setSelectedDate(undefined);
      setSelectedTime('');
      setSelectedService('');
      setClientName('');
      setClientPhone('');
      setClientEmail('');
      setNotes('');
      setShowBooking(false);
      fetchAppointments();
    }
  };

  const getSelectedServiceDetails = () => {
    return services.find(s => s.id === selectedService);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-gray-900 font-sans"> {/* CAMBIO: Fondo Slate-100 para menos blancura */}
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setShowBooking(false)}>
              <div className="bg-amber-100 p-2 rounded-lg">
                <Scissors className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">Barbería New Orland</h1>
                <p className="text-sm text-gray-500 font-medium">Reserva tu Estilo</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* CAMBIO: Botón visible en móvil (quite el hidden md:flex) */}
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin')}
                className="flex border-amber-500 text-amber-600 hover:bg-amber-50 px-3 md:px-4"
              >
                <User className="mr-2 h-4 w-4" />
                <span className="hidden md:inline">Soy Barbero</span> {/* Texto oculto en movil muy pequeño, icono visible */}
                <span className="md:hidden">Ingresar</span>
              </Button>
              
              <Button 
                onClick={() => setShowBooking(!showBooking)} 
                className="bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all hover:scale-105"
              >
                {showBooking ? 'Ver Servicios' : 'Reservar'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {!showBooking ? (
          <div className="space-y-10 max-w-6xl mx-auto">
             {/* Hero Section */}
             <div className="text-center space-y-4 mb-12">
                <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
                  Tu estilo, <span className="text-amber-500">nuestra pasión</span>
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Selecciona tu servicio, elige el horario que más te acomode y listo.
                </p>
             </div>

            {/* Services Section */}
            <div>
              <div className="flex items-center space-x-2 mb-6">
                 <Scissors className="h-6 w-6 text-amber-500" />
                 <h3 className="text-2xl font-bold text-gray-900">Nuestros Servicios</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map(service => (
                  <Card key={service.id} className="group hover:shadow-xl transition-all duration-300 border-gray-100 bg-white overflow-hidden">
                    <CardHeader className="pb-3 bg-gray-50/50 border-b border-gray-100">
                      <CardTitle className="text-lg font-bold text-gray-800">{service.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-5 space-y-4">
                      <p className="text-gray-600 text-sm leading-relaxed min-h-[40px]">{service.description}</p>
                      <div className="flex justify-between items-end pt-2">
                        <div>
                           <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Precio</p>
                           <span className="text-xl font-bold text-amber-600">${service.price.toLocaleString()} CLP</span>
                        </div>
                        <div className="flex items-center text-gray-400 bg-gray-100 px-3 py-1 rounded-full text-xs font-medium">
                          <Clock className="h-3 w-3 mr-1" />
                          {service.duration_minutes} min
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          setSelectedService(service.id);
                          setShowBooking(true);
                        }}
                        className="w-full mt-4 bg-gray-900 text-white hover:bg-gray-800"
                      >
                        Seleccionar
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Información de contacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
               <Card className="bg-gray-900 text-white border-none shadow-2xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold flex items-center gap-2">
                      <Phone className="h-6 w-6 text-amber-400" /> Contáctanos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                     <div className="flex items-center space-x-3 text-gray-300">
                        <Phone className="h-5 w-5 text-amber-500" />
                        <span className="text-lg">+56 9 8911 9792</span>
                     </div>
                     <div className="flex items-center space-x-3 text-gray-300">
                        <MapPin className="h-5 w-5 text-amber-500" />
                        <span className="text-lg">Av. El Valle 6647, 7760599 Peñalolén, Región Metropolitana</span>
                     </div>
                  </CardContent>
               </Card>

               <Card className="bg-white border-gray-200 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="h-6 w-6 text-amber-500" /> Horarios
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-2">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                           <span className="font-medium text-gray-700">Lunes a Domingo</span>
                           <span className="text-amber-600 font-bold">12:00 PM - 21:00 PM</span>
                        </div>
                     </div>
                  </CardContent>
               </Card>
            </div>

          </div>
        ) : (
          /* Formulario de Reserva */
          <Card className="max-w-2xl mx-auto bg-white border-gray-200 shadow-2xl">
            <CardHeader className="bg-gray-50 border-b border-gray-100">
              <Button variant="ghost" className="w-fit pl-0 hover:bg-transparent text-gray-500 mb-2" onClick={() => setShowBooking(false)}>
                ← Volver a servicios
              </Button>
              <CardTitle className="text-2xl font-bold text-gray-900">Finaliza tu Reserva</CardTitle>
              <CardDescription className="text-gray-500">
                Estás a un paso de tu nuevo estilo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 p-6 md:p-8">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Servicio Seleccionado</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger className="bg-white border-gray-300 focus:ring-amber-500">
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.price.toLocaleString()} CLP
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* CAMBIO: Arreglo de fecha para permitir seleccionar "Hoy" */}
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Fecha de la cita</Label>
                <div className="flex justify-center border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                   <Calendar 
                     mode="single" 
                     selected={selectedDate} 
                     onSelect={setSelectedDate} 
                     disabled={(date) => {
                        // Crear una fecha para "hoy" a las 00:00:00
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        // Deshabilitar solo si la fecha es ANTERIOR a hoy (ayer hacia atrás)
                        return date < today;
                     }}
                     className="rounded-md bg-white shadow-sm"
                   />
                </div>
              </div>

              {selectedDate && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                  <Label className="text-gray-700 font-medium">Horario disponible</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="bg-white border-gray-300">
                      <SelectValue placeholder="--:--" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {timeSlots.map(time => {
                        const isOccupied = occupiedSlots.includes(time);
                        return (
                          <SelectItem key={time} value={time} disabled={isOccupied} className={isOccupied ? 'text-gray-300 line-through' : 'font-medium'}>
                            {time} {isOccupied ? '(Ocupado)' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">* Los horarios ocupados se marcan automáticamente.</p>
                </div>
              )}

              <div className="border-t border-gray-100 my-4"></div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Nombre Completo</Label>
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Juan Pérez" className="bg-white border-gray-300" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700 font-medium">Teléfono</Label>
                  <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+56 9..." className="bg-white border-gray-300" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Email (Opcional)</Label>
                <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="cliente@correo.com" className="bg-white border-gray-300" />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Notas (Opcional)</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ej: Me gustaría un degradado bajo..." className="bg-white border-gray-300" />
              </div>

              {selectedService && selectedDate && selectedTime && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                    <h3 className="text-amber-800 font-bold mb-2 flex items-center"><Scissors className="w-4 h-4 mr-2"/> Resumen</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-700">
                      <span>Servicio:</span> <span className="font-semibold">{getSelectedServiceDetails()?.name}</span>
                      <span>Fecha:</span> <span className="font-semibold">{format(selectedDate, 'dd/MM/yyyy', { locale: es })}</span>
                      <span>Hora:</span> <span className="font-semibold">{selectedTime} hrs</span>
                      <span>Total:</span> <span className="font-bold text-amber-600">${getSelectedServiceDetails()?.price.toLocaleString()} CLP</span>
                    </div>
                </div>
              )}

              <Button onClick={handleBookAppointment} disabled={loading || !selectedDate || !selectedTime || !selectedService || !clientName || !clientPhone} className="w-full h-12 text-lg bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg mt-4">
                {loading ? 'Confirmando...' : 'Confirmar Reserva'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;