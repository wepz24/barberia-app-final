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
import { Calendar, Clock, Phone, Scissors, LogOut, User } from 'lucide-react';
import bcrypt from 'bcryptjs';

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminInfo, setAdminInfo] = useState<any>(null);

  // --- LÓGICA DE ACTUALIZACIÓN AUTOMÁTICA (POLLING) ---
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const admin = localStorage.getItem('admin_info');
    
    if (token && admin) {
      setIsAuthenticated(true);
      setAdminInfo(JSON.parse(admin));
      fetchAppointments();
      
      // ESTO ES LO QUE ACTUALIZA SOLO: Revisa cada 3 segundos
      const intervalo = setInterval(() => {
        fetchAppointments(true); // true = silencioso (sin mostrar toast a cada rato)
      }, 3000);

      return () => clearInterval(intervalo);
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!email || !password) { toast.error('Ingresa datos'); return; }
    setLoading(true);
    try {
      const { data: user, error } = await supabase.from('admin_users_2025_12_05_15_37').select('*').eq('email', email).maybeSingle();
      if (error || !user) { toast.error('Usuario no encontrado'); setLoading(false); return; }
      if (user.role !== 'barber') { toast.error('Acceso denegado'); setLoading(false); return; }
      
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) { toast.error('Contraseña incorrecta'); setLoading(false); return; }

      const token = btoa(`${user.id}:${Date.now()}`);
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_info', JSON.stringify(user));
      setIsAuthenticated(true);
      setAdminInfo(user);
      toast.success(`Bienvenido, ${user.name}`);
      fetchAppointments();
    } catch (error) { console.error(error); toast.error('Error de login'); } finally { setLoading(false); }
  };

  const handleLogout = () => {
    localStorage.clear();
    setIsAuthenticated(false);
    setAdminInfo(null);
    setEmail('');
    setPassword('');
  };

  const fetchAppointments = async (silent = false) => {
    const { data, error } = await supabase.from('appointments_2025_12_05_15_37')
      .select(`*, services_2025_12_05_15_37 (name)`)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });
    
    if (error && !silent) toast.error('Error al cargar');
    else setAppointments(data || []);
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('appointments_2025_12_05_15_37').update({ status }).eq('id', id);
    toast.success('Estado actualizado');
    fetchAppointments();
  };

  const formatDateSafe = (dateString: string) => {
    if (!dateString) return '';
    const date = parseISO(dateString.includes('T') ? dateString : `${dateString}T00:00:00`);
    return format(date, "EEEE d 'de' MMMM", { locale: es });
  };

  // --- VISTA LOGIN (DISEÑO LIMPIO Y CENTRADO) ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="bg-slate-900 border-slate-800 w-full max-w-md shadow-2xl">
          <CardHeader className="text-center space-y-2">
             <div className="mx-auto bg-orange-500/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                <Scissors className="h-6 w-6 text-orange-500" />
             </div>
            <CardTitle className="text-2xl text-white">Administración</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Email</Label>
              <div className="relative">
                 <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500"/>
                 <Input value={email} onChange={e => setEmail(e.target.value)} className="bg-slate-950 border-slate-700 text-white pl-10" placeholder="correo@ejemplo.com"/>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-white">Contraseña</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} className="bg-slate-950 border-slate-700 text-white"/>
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold">
              {loading ? '...' : 'Ingresar'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- VISTA DASHBOARD (ESTILO CLÁSICO + FUNCIONAL) ---
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-8 font-sans">
      <nav className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex gap-2 items-center"><Scissors className="text-orange-500"/> Panel de Control</h1>
          <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Actualizando en vivo
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout} className="border-red-900 text-red-500 hover:bg-red-950"><LogOut className="h-4 w-4 mr-2"/> Salir</Button>
      </nav>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {appointments.map((apt) => (
          <Card key={apt.id} className="bg-slate-900 border-slate-800 hover:border-orange-500/30 transition-all">
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-white">{apt.client_name}</h3>
                <Badge className={
                  apt.status === 'confirmed' ? 'bg-green-900 text-green-300 hover:bg-green-900' : 
                  apt.status === 'completed' ? 'bg-blue-900 text-blue-300 hover:bg-blue-900' : 
                  apt.status === 'cancelled' ? 'bg-red-900 text-red-300 hover:bg-red-900' : 
                  'bg-yellow-900 text-yellow-300 hover:bg-yellow-900'
                }>
                  {apt.status === 'confirmed' ? 'Confirmada' : apt.status === 'completed' ? 'Lista' : apt.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
                </Badge>
              </div>
              <p className="text-orange-400 text-sm font-medium">{apt.services_2025_12_05_15_37?.name}</p>
              
              <div className="text-sm text-slate-400 space-y-1 bg-slate-950 p-3 rounded border border-slate-800">
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4"/> {formatDateSafe(apt.appointment_date)}</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4"/> {apt.appointment_time}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4"/> {apt.client_phone}</div>
                {apt.notes && <div className="text-xs italic mt-1 text-slate-500">"{apt.notes}"</div>}
              </div>

              {/* BOTONES SIMPLIFICADOS */}
              {apt.status === 'pending' && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => updateStatus(apt.id, 'confirmed')}>Confirmar</Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(apt.id, 'cancelled')}>Cancelar</Button>
                </div>
              )}
              {apt.status === 'confirmed' && (
                 <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => updateStatus(apt.id, 'completed')}>Marcar como Terminado</Button>
              )}
            </CardContent>
          </Card>
        ))}
        {appointments.length === 0 && <p className="text-slate-500 col-span-full text-center">No hay citas.</p>}
      </div>
    </div>
  );
};
export default Admin;