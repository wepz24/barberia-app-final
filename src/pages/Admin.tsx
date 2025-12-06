import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Lock, Calendar, Clock, User, Phone, Mail, Scissors, LogOut } from 'lucide-react';
import bcrypt from 'bcryptjs'; // <--- Seguridad Importada

// Interfaces para TypeScript
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
  created_at: string;
  services_2025_12_05_15_37: Service;
}

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [adminInfo, setAdminInfo] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const admin = localStorage.getItem('admin_info');
    if (token && admin) {
      setIsAuthenticated(true);
      setAdminInfo(JSON.parse(admin));
      fetchAppointments();
    }
  }, []);

  // --- LOGIN SEGURO CON BCRYPT ---
  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Por favor ingresa email y contraseña');
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
        toast.error('No tienes permisos de barbero');
        setLoading(false);
        return;
      }

      const isValid = await bcrypt.compare(password, user.password_hash);

      if (!isValid) {
        toast.error('Contraseña incorrecta');
        setLoading(false);
        return;
      }

      // Éxito
      localStorage.setItem('admin_token', 'true');
      localStorage.setItem('admin_info', JSON.stringify(user));
      setIsAuthenticated(true);
      setAdminInfo(user);
      toast.success(`Bienvenido ${user.name}`);
      fetchAppointments();

    } catch (error) {
      console.error(error);
      toast.error('Error al iniciar sesión');
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
      .select(`
        *,
        services_2025_12_05_15_37 (name, price, duration_minutes)
      `)
      .order('appointment_date')
      .order('appointment_time');

    if (error) {
      toast.error('Error al cargar citas');
    } else {
      setAppointments(data || []);
    }
  };

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    const { error } = await supabase
      .from('appointments_2025_12_05_15_37')
      .update({ status: newStatus })
      .eq('id', appointmentId);

    if (error) {
      toast.error('Error al actualizar estado');
    } else {
      toast.success('Estado actualizado');
      fetchAppointments();
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'confirmed': return 'Confirmada';
      case 'completed': return 'Completada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const getTodayAppointments = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return appointments.filter(apt => apt.appointment_date === today);
  };

  const getUpcomingAppointments = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return appointments.filter(apt => apt.appointment_date > today);
  };

  // --- VISTA DE LOGIN ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Panel de Administración</h2>
            <p className="mt-2 text-slate-400">Acceso seguro (Bcrypt)</p>
          </div>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Iniciar Sesión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Contraseña</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
              </div>
              <Button onClick={handleLogin} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold">
                {loading ? 'Entrando...' : 'Iniciar Sesión'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- VISTA COMPLETA DEL DASHBOARD (LO QUE FALTABA) ---
  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-8 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Scissors className="h-8 w-8 text-orange-500" />
            Panel de Control
          </h1>
          <p className="text-slate-400">Bienvenido, {adminInfo?.name}</p>
        </div>
        <Button onClick={handleLogout} variant="destructive" className="flex gap-2">
          <LogOut className="h-4 w-4" /> Salir
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-400">Citas de Hoy</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{getTodayAppointments().length}</div></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-400">Próximas</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{getUpcomingAppointments().length}</div></CardContent>
        </Card>
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-slate-400">Total Histórico</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-white">{appointments.length}</div></CardContent>
        </Card>
      </div>

      {/* SECCIÓN: CITAS DE HOY */}
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-500" /> Citas de Hoy ({format(new Date(), 'dd/MM/yyyy')})
          </h2>
          {getTodayAppointments().length === 0 ? (
            <p className="text-slate-500 italic">No hay citas para hoy.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {getTodayAppointments().map((apt) => (
                <Card key={apt.id} className="bg-slate-800 border-slate-700">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-white">{apt.client_name}</h3>
                        <p className="text-orange-400 text-sm">{apt.services_2025_12_05_15_37?.name}</p>
                      </div>
                      <Badge className={apt.status === 'confirmed' ? 'bg-green-600' : 'bg-yellow-600'}>
                        {getStatusText(apt.status)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-1 text-sm text-slate-300">
                      <div className="flex items-center gap-2"><Clock className="h-4 w-4"/> {apt.appointment_time}</div>
                      <div className="flex items-center gap-2"><Phone className="h-4 w-4"/> {apt.client_phone}</div>
                    </div>

                    <div className="pt-2 flex gap-2">
                      {apt.status === 'pending' && (
                        <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700" 
                          onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}>Confirmar</Button>
                      )}
                      {apt.status === 'confirmed' && (
                        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700" 
                          onClick={() => updateAppointmentStatus(apt.id, 'completed')}>Completar</Button>
                      )}
                      {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                        <Button size="sm" variant="outline" className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white" 
                          onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}>Cancelar</Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* SECCIÓN: TODAS LAS CITAS */}
        <div>
          <h2 className="text-xl font-bold mb-4 mt-8 text-slate-300">Historial Completo</h2>
          <div className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
            {appointments.length === 0 ? (
              <div className="p-4 text-center text-slate-500">No hay citas registradas</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-400">
                  <thead className="bg-slate-900 text-slate-200 uppercase font-medium">
                    <tr>
                      <th className="p-3">Cliente</th>
                      <th className="p-3">Servicio</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Hora</th>
                      <th className="p-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {appointments.map((apt) => (
                      <tr key={apt.id} className="hover:bg-slate-700/50">
                        <td className="p-3 font-medium text-white">{apt.client_name}</td>
                        <td className="p-3">{apt.services_2025_12_05_15_37?.name}</td>
                        <td className="p-3">{format(new Date(apt.appointment_date), 'dd/MM/yyyy')}</td>
                        <td className="p-3">{apt.appointment_time}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs text-white 
                            ${apt.status === 'confirmed' ? 'bg-blue-600' : 
                              apt.status === 'completed' ? 'bg-green-600' : 
                              apt.status === 'cancelled' ? 'bg-red-600' : 'bg-yellow-600'}`}>
                            {getStatusText(apt.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;