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
import { CalendarIcon, Clock, Scissors, Phone, Mail, User } from 'lucide-react';

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
  
  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30'];

  useEffect(() => {
    fetchServices();
    fetchAppointments();
  }, []);

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

  // Función para obtener horarios ocupados en una fecha específica
  const fetchOccupiedSlots = async (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const { data, error } = await supabase.from('appointments_2025_12_05_15_37').select('appointment_time, services_2025_12_05_15_37(duration_minutes)').eq('appointment_date', dateStr).in('status', ['pending', 'confirmed']);
    if (error) {
      console.error('Error al cargar horarios ocupados:', error);
      return [];
    }

    // Calcular todos los slots ocupados considerando la duración del servicio
    const occupied: string[] = [];
    data?.forEach(appointment => {
      const startTime = appointment.appointment_time;
      const duration = appointment.services_2025_12_05_15_37?.duration_minutes || 30;

      // Agregar el slot inicial
      occupied.push(startTime);

      // Agregar slots adicionales según la duración
      const [hours, minutes] = startTime.split(':').map(Number);
      let currentMinutes = hours * 60 + minutes;
      const endMinutes = currentMinutes + duration;

      // Marcar todos los slots de 30 minutos que están ocupados
      currentMinutes += 30;
      while (currentMinutes < endMinutes) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const timeSlot = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        if (timeSlots.includes(timeSlot)) {
          occupied.push(timeSlot);
        }
        currentMinutes += 30;
      }
    });
    return [...new Set(occupied)];
  };

  // Actualizar horarios ocupados cuando cambia la fecha
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

    // Verificar si el horario está ocupado
    if (occupiedSlots.includes(selectedTime)) {
      toast.error('Este horario ya está ocupado. Por favor selecciona otro.');
      return;
    }
    setLoading(true);

    // Verificar nuevamente en la base de datos por seguridad
    const { data: existingAppointment } = await supabase.from('appointments_2025_12_05_15_37').select('id').eq('appointment_date', format(selectedDate, 'yyyy-MM-dd')).eq('appointment_time', selectedTime).in('status', ['pending', 'confirmed']).single();
    if (existingAppointment) {
      setLoading(false);
      toast.error('Este horario ya fue reservado por otro cliente. Por favor selecciona otro.');
      // Actualizar horarios ocupados
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
      // Reset form
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
    <div className="min-h-screen bg-gray-50"> {/* CAMBIO: Fondo claro en lugar de azul oscuro */}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Scissors className="h-8 w-8 text-amber-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Barbería New Orland</h1> {/* CAMBIO: Texto oscuro */}
                <p className="text-gray-500">Reserva tu cita online</p>
              </div>
            </div>
            <Button onClick={() => setShowBooking(!showBooking)} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold">
              {showBooking ? 'Ver Citas' : 'Reservar Cita'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {!showBooking ? (
          <div className="space-y-8">
            {/* Services Section */}
            <Card className="bg-white border-gray-200 shadow-md"> {/* CAMBIO: Tarjeta blanca */}
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center space-x-2">
                  <Scissors className="h-5 w-5" />
                  <span>Nuestros Servicios</span>
                </CardTitle>
                <CardDescription className="text-gray-500">
                  Servicios profesionales de barbería
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map(service => (
                    <Card key={service.id} className="bg-white border border-gray-200 hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-amber-600 font-bold">${service.price.toLocaleString()} CLP</span>
                          <span className="text-gray-500 text-sm flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {service.duration_minutes} min
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Información de contacto y horarios */}
            <Card className="bg-white border-gray-200 shadow-md">
              <CardHeader>
                <CardTitle className="text-gray-900">Información de Contacto</CardTitle>
                <CardDescription className="text-gray-500">
                  Horarios de atención y contacto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-gray-900 font-semibold mb-3">Horarios de Atención</h3>
                    <div className="space-y-2 text-gray-600">
                      <p>Lunes a Viernes: 9:00 AM - 7:00 PM</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-gray-900 font-semibold mb-3">Contacto</h3>
                    <div className="space-y-2 text-gray-600">
                      <p className="flex items-center space-x-2">
                        <Phone className="h-4 w-4" />
                        <span>+56 9 1234 5678</span>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Booking Form */
          <Card className="max-w-2xl mx-auto bg-white border-gray-200 shadow-xl">
            <CardHeader>
              <CardTitle className="text-gray-900">Reservar Nueva Cita</CardTitle>
              <CardDescription className="text-gray-500">
                Completa el formulario para reservar tu cita
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Service Selection */}
              <div className="space-y-2">
                <Label className="text-gray-700">Servicio *</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(service => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.price.toLocaleString()} CLP ({service.duration_minutes} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <Label className="text-gray-700">Fecha *</Label>
                <div className="flex justify-center border rounded-md p-2">
                   <Calendar 
                     mode="single" 
                     selected={selectedDate} 
                     onSelect={setSelectedDate} 
                     disabled={date => date < new Date() || date.getDay() === 0} 
                     className="rounded-md border-gray-200" 
                    />
                </div>
              </div>

              {/* Time Selection */}
              {selectedDate && (
                <div className="space-y-2">
                  <Label className="text-gray-700">Hora *</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                      <SelectValue placeholder="Selecciona una hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(time => {
                        const isOccupied = occupiedSlots.includes(time);
                        return (
                          <SelectItem key={time} value={time} disabled={isOccupied} className={isOccupied ? 'opacity-50 cursor-not-allowed' : ''}>
                            {time} {isOccupied ? '(Ocupado)' : ''}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Client Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Nombre Completo *</Label>
                  <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Tu nombre completo" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Teléfono *</Label>
                  <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Tu número de teléfono" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Email (opcional)</Label>
                <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="tu@email.com" className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
              </div>

              <div className="space-y-2">
                <Label className="text-gray-700">Notas adicionales</Label>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Alguna preferencia o comentario especial..." className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400" />
              </div>

              {/* Summary */}
              {selectedService && selectedDate && selectedTime && (
                <Card className="bg-amber-50 border-amber-200">
                  <CardContent className="p-4">
                    <h3 className="text-amber-600 font-semibold mb-2">Resumen de tu cita</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-700"><strong>Servicio:</strong> {getSelectedServiceDetails()?.name}</p>
                      <p className="text-gray-700"><strong>Fecha:</strong> {format(selectedDate, 'dd/MM/yyyy', { locale: es })}</p>
                      <p className="text-gray-700"><strong>Hora:</strong> {selectedTime}</p>
                      <p className="text-gray-700"><strong>Duración:</strong> {getSelectedServiceDetails()?.duration_minutes} minutos</p>
                      <p className="text-amber-600 font-semibold"><strong>Precio:</strong> ${getSelectedServiceDetails()?.price.toLocaleString()} CLP</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button onClick={handleBookAppointment} disabled={loading || !selectedDate || !selectedTime || !selectedService || !clientName || !clientPhone} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold">
                {loading ? 'Reservando...' : 'Confirmar Reserva'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;