import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { Scissors, Clock, Phone, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// 1. CONFIGURACIÓN DE SERVICIOS
const SERVICES = [
  { id: '1', name: 'Corte de Cabello Clásico', price: 10000, duration: 60, description: 'Corte tradicional con tijeras y máquina' },
  { id: '2', name: 'Corte Niño', price: 10000, duration: 60, description: 'Corte especial para niños hasta 12 años' },
  { id: '3', name: 'Solo Barba', price: 12000, duration: 60, description: 'Arreglo y perfilado de barba' },
  { id: '4', name: 'Corte + Barba', price: 25000, duration: 60, description: 'Corte de cabello completo más arreglo de barba' }
];

// 2. SOLUCIÓN DE HORARIOS (Estrictos: 12:00 a 21:00, cada 60 min)
const TIME_SLOTS = [
  "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"
];

const Index = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedService, setSelectedService] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!date || !selectedService || !selectedTime) {
      toast.error('Por favor selecciona fecha, hora y servicio');
      return;
    }

    setIsSubmitting(true);

    try {
      // Buscar ID del servicio
      const serviceName = SERVICES.find(s => s.id === selectedService)?.name;
      const { data: serviceData } = await supabase
        .from('services_2025_12_05_15_37')
        .select('id')
        .eq('name', serviceName)
        .maybeSingle();

      const finalServiceId = serviceData?.id || selectedService;

      // 3. SOLUCIÓN ZONA HORARIA
      const dateString = format(date, 'yyyy-MM-dd'); 

      const { error } = await supabase
        .from('appointments_2025_12_05_15_37')
        .insert({
          client_name: formData.name,
          client_phone: formData.phone,
          client_email: formData.email,
          service_id: finalServiceId,
          appointment_date: dateString,
          appointment_time: selectedTime,
          notes: formData.notes,
          status: 'pending'
        });

      if (error) throw error;

      toast.success(`¡Listo ${formData.name}! Tu cita quedó agendada.`);
      
      setFormData({ name: '', phone: '', email: '', notes: '' });
      setSelectedTime('');
      setSelectedService('');
      setDate(new Date());

    } catch (error) {
      console.error('Error:', error);
      toast.error('Hubo un error al agendar. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-orange-500/30">
      
      {/* Navbar con Botón de Login (SOY BARBERO) */}
      <nav className="w-full p-4 flex justify-between items-center max-w-6xl mx-auto border-b border-white/5 mb-8">
        <div className="flex items-center gap-2">
          <Scissors className="h-6 w-6 text-orange-500" />
          {/* CAMBIO DE NOMBRE AQUI */}
          <span className="font-bold text-xl tracking-tight">Barbería New Orland</span>
        </div>
        <Button 
          variant="outline" 
          className="bg-transparent border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-black gap-2 transition-all"
          onClick={() => navigate('/admin')}
        >
          <Lock className="h-4 w-4" />
          Soy Barbero
        </Button>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-12">
        
        {/* Título */}
        <header className="text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight">
            Reserva tu <span className="text-orange-500">Estilo</span>
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Selecciona tu servicio, elige el horario que más te acomode y listo.
          </p>
        </header>

        {/* Formulario Principal */}
        <div className="grid md:grid-cols-12 gap-8">
          
          {/* Columna Izquierda: Datos de Reserva */}
          <div className="md:col-span-7 space-y-8">
            <Card className="bg-slate-900 border-white/10 shadow-2xl">
              <div className="h-1 bg-gradient-to-r from-orange-600 to-yellow-500" />
              <CardContent className="p-6 md:p-8 space-y-8">
                
                {/* Servicios */}
                <div className="space-y-3">
                  <Label className="text-white text-lg">¿Qué te haremos hoy?</Label>
                  <Select value={selectedService} onValueChange={setSelectedService}>
                    <SelectTrigger className="bg-slate-950 border-white/10 h-14 text-white text-lg">
                      <SelectValue placeholder="Selecciona un servicio" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      {SERVICES.map((service) => (
                        <SelectItem key={service.id} value={service.id} className="focus:bg-orange-500/20">
                          {service.name} - ${service.price.toLocaleString('es-CL')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Calendario y Hora */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-white text-lg">Fecha</Label>
                    <div className="border border-white/10 rounded-lg p-3 bg-slate-950 flex justify-center">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        locale={es}
                        className="rounded-md"
                        // DOMINGOS HABILITADOS (Solo bloquea fechas pasadas)
                        disabled={(date) => isBefore(date, startOfDay(new Date()))} 
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-white text-lg">Hora (60 min)</Label>
                    <Select value={selectedTime} onValueChange={setSelectedTime}>
                      <SelectTrigger className="bg-slate-950 border-white/10 h-14 text-white text-lg">
                        <SelectValue placeholder="--:--" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white h-60">
                        {TIME_SLOTS.map((time) => (
                          <SelectItem key={time} value={time} className="focus:bg-orange-500/20">
                            {time}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500 mt-2">
                      * Intervalos de 1 hora exacta.
                    </p>
                  </div>
                </div>

                {/* Datos Personales */}
                <div className="space-y-4 pt-4 border-t border-white/5">
                  <Label className="text-white text-lg">Tus Datos</Label>
                  <Input 
                    placeholder="Nombre Completo" 
                    className="bg-slate-950 border-white/10 h-12 text-white" 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                  />
                  <Input 
                    placeholder="Teléfono (+56 9...)" 
                    type="tel"
                    className="bg-slate-950 border-white/10 h-12 text-white" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                  />
                  <Textarea 
                    placeholder="Notas adicionales (opcional)..." 
                    className="bg-slate-950 border-white/10 min-h-[100px] text-white" 
                    value={formData.notes} 
                    onChange={e => setFormData({...formData, notes: e.target.value})} 
                  />
                </div>

                <Button 
                  onClick={handleSubmit}
                  disabled={isSubmitting} 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold h-14 text-xl mt-4 shadow-lg shadow-orange-500/20"
                >
                  {isSubmitting ? 'Confirmando...' : 'CONFIRMAR RESERVA'}
                </Button>

              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha: Información */}
          <div className="md:col-span-5 space-y-6">
            
            <Card className="bg-slate-900/50 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                  <Phone className="text-orange-500" /> Contacto
                </h3>
                <div className="space-y-2 text-slate-400">
                  <p className="flex items-center gap-2 text-lg text-white font-mono">
                     +56 9 8911 9792
                  </p>
                  <p>Dirección: Av. Siempre Viva 742</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-white/10">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-xl text-white flex items-center gap-2">
                  <Clock className="text-orange-500" /> Horarios
                </h3>
                <div className="space-y-2 text-slate-400">
                  <p>Lunes a Domingo</p>
                  <p className="text-orange-400 font-bold">12:00 PM - 21:00 PM</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </main>

      <footer className="py-8 text-center text-slate-600 text-sm border-t border-white/5 mt-12">
        {/* CAMBIO DE NOMBRE AQUI TAMBIEN */}
        <p>© 2025 Barbería New Orland. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
};

export default Index;