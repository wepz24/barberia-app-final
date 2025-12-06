import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Clock, Phone, Scissors, LogOut, RefreshCw } from 'lucide-react';
import bcrypt from 'bcryptjs';

// Interfaces
interface Service { name: string; }
interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  service_id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string;
  services_2025_12_05_15_37: Service;
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminInfo, setAdminInfo] = useState<any>(null);

  // --- EFECTO DE INICIO Y TIEMPO REAL ---
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const admin = localStorage.getItem('admin_info');
    
    if (token && admin) {
      setIsAuthenticated(true);
      setAdminInfo(JSON.parse(admin));
      fetchAppointments();
      
      // AQUÍ ESTÁ LA MAGIA DEL TIEMPO REAL
      // Nos suscribimos a cambios en la tabla de citas
      const channel = supabase
        .channel('cambios-citas')
        .on(
          'postgres_changes',
          {
            event: '*', // Escuchar TODO (Nuevas citas, cambios de estado, borrados)
            schema: 'public',
            table: 'appointments_2025_12_05_15_37'
          },
          (payload) => {
            console.log('Cambio detectado en DB:', payload);
            toast.info('🔄 Actualizando citas...');
            fetchAppointments(); // Recargamos la lista automáticamente
          }
        )
        .subscribe();

      // Limpieza al salir
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [isAuthenticated]); // Se ejecuta cuando uno se autentica

  // Login Seguro
  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Ingresa datos');
      return;
    }
    setLoading(true);

    try {
      const { data: user, error } = await supabase
        .from('admin_users_2025_12_05_15_37')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error || !user) {
        toast.error('Usuario no encontrado');
        setLoading(false);
        return;
      }

      if (user.role !== 'barber') {
        toast.error('Acceso denegado');
        setLoading(false);
        return;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        toast.error('Contraseña incorrecta');
        setLoading(false);
        return;
      }

      const token = btoa(`${user.id}:${Date.now()}`);
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_info', JSON.stringify(user));
      
      setIsAuthenticated(true);
      setAdminInfo(user);
      toast.success(`Hola, ${user.name}`);
      fetchAppointments();

    } catch (error) {
      console.error(error);
      toast.error('Error de login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_info');
    setIsAuthenticated(false);
    setAdminInfo(null);
    setEmail('');
    setPassword('');
  };

  const fetchAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments_2025_12_05_15_37')
      .select(`*, services_2025_12_05_15_37 (name)`)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (error) toast.error('Error al cargar');
    else setAppointments(data || []);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('appointments_2025_12_05_15_37').update({ status }).eq('id', id);
    // No hace falta llamar a fetchAppointments() aquí porque el Realtime lo hará solo ;)
  };

  // Formatear fecha seguro (sin error de zona horaria)
  const formatDateSafe = (dateString: string) => {
    if (!dateString) return '';
    const date = parseISO(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    return format(date, 'dd/MM/yyyy', { locale: es });
  };

  const getTodayAppointments = () => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd'); 
    return appointments.filter(apt => apt.appointment_date === todayStr);
  };

  // VISTA LOGIN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-white text-center">Admin Barbería</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Email</Label>
              <Input value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-900 text-white border-slate-600"/>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Contraseña</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-slate-900 text-white border-slate-600"/>
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold">
              {loading ? '...' : 'Entrar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // VISTA DASHBOARD
  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold flex gap-2 items-center">
            <Scissors className="text-orange-500"/> Panel de Control
          </h1>
          <p className="text-slate-400 text-sm flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></span>
            Conectado en tiempo real
          </p>
        </div>
        <Button variant="destructive" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2"/> Salir
        </Button>
      </div>

      {/* Resumen */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Hoy</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{getTodayAppointments().length}</div></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm text-slate-400">Total</CardTitle></CardHeader>
          <CardContent><div className="text-3xl font-bold">{appointments.length}</div></CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Calendar className="h-5 w-5 text-orange-500"/> Agenda
      </h2>
      
      {/* Lista de Citas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {appointments.map((apt) => (
          <Card key={apt.id} className="bg-slate-800 border-slate-700 hover:border-orange-500/30 transition-all">
            <CardContent className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg">{apt.client_name}</h3>
                  <p className="text-orange-400 text-sm">{apt.services_2025_12_05_15_37?.name}</p>
                </div>
                <Badge className={
                  apt.status === 'confirmed' ? 'bg-green-600' : 
                  apt.status === 'completed' ? 'bg-blue-600' : 
                  apt.status === 'cancelled' ? 'bg-red-600' : 'bg-yellow-600'
                }>
                  {apt.status === 'confirmed' ? 'Confirmada' : 
                   apt.status === 'completed' ? 'Lista' : 
                   apt.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                </Badge>
              </div>
              
              <div className="text-sm text-slate-300 space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4"/> {formatDateSafe(apt.appointment_date)}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4"/> {apt.appointment_time} hrs
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4"/> {apt.client_phone}
                </div>
                {apt.notes && (
                  <div className="text-xs text-slate-500 mt-2 bg-slate-900 p-2 rounded">
                    Nota: {apt.notes}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                {apt.status === 'pending' && (
                  <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" 
                    onClick={() => updateStatus(apt.id, 'confirmed')}>Confirmar</Button>
                )}
                {apt.status === 'confirmed' && (
                  <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700" 
                    onClick={() => updateStatus(apt.id, 'completed')}>Completar</Button>
                )}
                {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                  <Button size="sm" variant="outline" className="w-full border-red-500 text-red-500 hover:bg-red-900/20" 
                    onClick={() => updateStatus(apt.id, 'cancelled')}>Cancelar</Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {appointments.length === 0 && (
          <p className="text-slate-500 col-span-full text-center py-10">No hay citas registradas.</p>
        )}
      </div>
    </div>
  );
};

export default Admin;