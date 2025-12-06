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

const SERVICES = [
  { id: '1', name: 'Corte de Cabello Clásico', price: 10000 },
  { id: '2', name: 'Corte Niño', price: 10000 },
  { id: '3', name: 'Solo Barba', price: 12000 },
  { id: '4', name: 'Corte + Barba', price: 25000 }
];

// HORARIOS EXACTOS 12 a 21
const TIME_SLOTS = ["12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"];

const Index = () => {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [selectedService, setSelectedService] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', notes: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !selectedService || !selectedTime) { toast.error('Faltan datos'); return; }
    setIsSubmitting(true);

    try {
      const serviceName = SERVICES.find(s => s.id === selectedService)?.name;
      const { data: serviceData } = await supabase.from('services_2025_12_05_15_37').select('id').eq('name', serviceName).maybeSingle();
      const finalServiceId = serviceData?.id || selectedService;
      
      // Fecha como texto simple para evitar cambios de hora
      const dateString = format(date, 'yyyy-MM-dd');

      const { error } = await supabase.from('appointments_2025_12_05_15_37').insert({
          client_name: formData.name, client_phone: formData.phone, client_email: formData.email,
          service_id: finalServiceId, appointment_date: dateString, appointment_time: selectedTime,
          notes: formData.notes, status: 'pending'
      });

      if (error) throw error;
      toast.success('¡Reserva Exitosa!');
      setFormData({ name: '', phone: '', email: '', notes: '' });
      setSelectedTime(''); setSelectedService(''); setDate(new Date());
    } catch (error) { toast.error('Error al reservar'); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <nav className="p-4 flex justify-between items-center max-w-6xl mx-auto border-b border-white/5">
        <div className="flex items-center gap-2 font-bold text-xl"><Scissors className="text-orange-500"/> Barbería Estilo</div>
        <Button variant="ghost" onClick={() => navigate('/admin')} className="text-slate-400 hover:text-white"><Lock className="h-4 w-4 mr-2"/> Soy Barbero</Button>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Reserva tu <span className="text-orange-500">Estilo</span></h1>
          <p className="text-slate-400">Selecciona tu servicio y horario.</p>
        </div>

        <Card className="bg-slate-900 border-slate-800 shadow-2xl">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-white">Servicio</Label>
              <Select value={selectedService} onValueChange={setSelectedService}>
                <SelectTrigger className="bg-slate-950 border-slate-700 h-12 text-white"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-700 text-white">
                  {SERVICES.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name} - ${s.price.toLocaleString('es-CL')}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-white">Fecha</Label>
                <div className="border border-slate-700 rounded-lg p-2 bg-slate-950 flex justify-center">
                  <Calendar mode="single" selected={date} onSelect={setDate} locale={es} 
                    disabled={(date) => isBefore(date, startOfDay(new Date()))} // Solo deshabilita pasado, deja domingos
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Hora (12:00 - 21:00)</Label>
                <Select value={selectedTime} onValueChange={setSelectedTime}>
                  <SelectTrigger className="bg-slate-950 border-slate-700 h-12 text-white"><SelectValue placeholder="--:--" /></SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700 text-white h-60">
                    {TIME_SLOTS.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-800">
              <Input placeholder="Nombre" className="bg-slate-950 border-slate-700 h-11 text-white" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <Input placeholder="Teléfono (+56 9...)" className="bg-slate-950 border-slate-700 h-11 text-white" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 text-lg">
                {isSubmitting ? '...' : 'CONFIRMAR RESERVA'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4 text-slate-400 text-sm">
          <div className="bg-slate-900/50 p-4 rounded border border-slate-800 flex items-center gap-3">
             <Phone className="text-orange-500 h-5 w-5"/> 
             <div><p className="font-bold text-white">Contacto</p><p>+56 9 8911 9792</p></div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded border border-slate-800 flex items-center gap-3">
             <Clock className="text-orange-500 h-5 w-5"/> 
             <div><p className="font-bold text-white">Horario</p><p>Lunes a Domingo (12:00 - 21:00)</p></div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;