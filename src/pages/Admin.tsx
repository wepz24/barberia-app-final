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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [adminInfo, setAdminInfo] = useState<any>(null);
  useEffect(() => {
    // Verificar si ya está autenticado
    const token = localStorage.getItem('admin_token');
    const admin = localStorage.getItem('admin_info');
    if (token && admin) {
      setIsAuthenticated(true);
      setAdminInfo(JSON.parse(admin));
      fetchAppointments();
    }
  }, []);
  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Por favor ingresa email y contraseña');
      return;
    }
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('admin_login_2025_12_05_15_37', {
        body: {
          email,
          password
        }
      });
      if (error || !data.success) {
        toast.error(data?.error || 'Error de autenticación');
        return;
      }

      // Guardar token y info del admin
      localStorage.setItem('admin_token', data.token);
      localStorage.setItem('admin_info', JSON.stringify(data.admin));
      setIsAuthenticated(true);
      setAdminInfo(data.admin);
      toast.success(`Bienvenido ${data.admin.name}`);
      fetchAppointments();
    } catch (error) {
      toast.error('Error de conexión');
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
    const {
      data,
      error
    } = await supabase.from('appointments_2025_12_05_15_37').select(`
        *,
        services_2025_12_05_15_37 (name, price, duration_minutes)
      `).order('appointment_date').order('appointment_time');
    if (error) {
      toast.error('Error al cargar citas');
    } else {
      setAppointments(data || []);
    }
  };
  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    const {
      error
    } = await supabase.from('appointments_2025_12_05_15_37').update({
      status: newStatus
    }).eq('id', appointmentId);
    if (error) {
      toast.error('Error al actualizar estado');
    } else {
      toast.success('Estado actualizado');
      fetchAppointments();
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'confirmed':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmada';
      case 'completed':
        return 'Completada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return status;
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
  if (!isAuthenticated) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Lock className="h-12 w-12 text-amber-400" />
            </div>
            <CardTitle className="text-white">Panel de Administración</CardTitle>
            <CardDescription className="text-slate-300">
              Acceso exclusivo para barberos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="barbero@barberia.com" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Contraseña</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="bg-white/10 border-white/20 text-white placeholder:text-slate-400" onKeyPress={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
            <div className="text-center text-sm text-slate-400 mt-4">
              
              
              
            </div>
          </CardContent>
        </Card>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Scissors className="h-8 w-8 text-amber-400" />
              <div>
                <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
                <p className="text-slate-300">Bienvenido, {adminInfo?.name}</p>
              </div>
            </div>
            <Button onClick={handleLogout} variant="outline" className="border-white/20 text-white hover:bg-white/10">
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">Citas de Hoy</p>
                  <p className="text-3xl font-bold text-white">{getTodayAppointments().length}</p>
                </div>
                <Calendar className="h-8 w-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">Próximas Citas</p>
                  <p className="text-3xl font-bold text-white">{getUpcomingAppointments().length}</p>
                </div>
                <Clock className="h-8 w-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-300 text-sm">Total Citas</p>
                  <p className="text-3xl font-bold text-white">{appointments.length}</p>
                </div>
                <User className="h-8 w-8 text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Appointments */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Citas de Hoy</CardTitle>
            <CardDescription className="text-slate-300">
              {format(new Date(), 'dd/MM/yyyy', {
              locale: es
            })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {getTodayAppointments().length === 0 ? <p className="text-slate-400 text-center py-8">No hay citas para hoy</p> : <div className="space-y-4">
                {getTodayAppointments().map(appointment => <div key={appointment.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="bg-amber-500/20 p-2 rounded-full">
                          <User className="h-4 w-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{appointment.client_name}</p>
                          <p className="text-slate-300 text-sm">{appointment.services_2025_12_05_15_37?.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-medium">{appointment.appointment_time}</p>
                        <Badge className={`${getStatusColor(appointment.status)} text-white`}>
                          {getStatusText(appointment.status)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-slate-400" />
                        <span className="text-slate-300">{appointment.client_phone}</span>
                      </div>
                      {appointment.client_email && <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-300">{appointment.client_email}</span>
                        </div>}
                      <div className="flex items-center space-x-2">
                        <span className="text-amber-400 font-medium">${appointment.services_2025_12_05_15_37?.price?.toLocaleString()}</span>
                      </div>
                    </div>

                    {appointment.notes && <div className="mt-3 p-2 bg-white/5 rounded text-sm">
                        <p className="text-slate-300"><strong>Notas:</strong> {appointment.notes}</p>
                      </div>}

                    <div className="flex space-x-2 mt-4">
                      {appointment.status === 'pending' && <Button size="sm" onClick={() => updateAppointmentStatus(appointment.id, 'confirmed')} className="bg-blue-500 hover:bg-blue-600 text-white">
                          Confirmar
                        </Button>}
                      {appointment.status === 'confirmed' && <Button size="sm" onClick={() => updateAppointmentStatus(appointment.id, 'completed')} className="bg-green-500 hover:bg-green-600 text-white">
                          Completar
                        </Button>}
                      {(appointment.status === 'pending' || appointment.status === 'confirmed') && <Button size="sm" variant="outline" onClick={() => updateAppointmentStatus(appointment.id, 'cancelled')} className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white">
                          Cancelar
                        </Button>}
                    </div>
                  </div>)}
              </div>}
          </CardContent>
        </Card>

        {/* All Appointments */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Todas las Citas</CardTitle>
            <CardDescription className="text-slate-300">
              Historial completo de citas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {appointments.length === 0 ? <p className="text-slate-400 text-center py-8">No hay citas registradas</p> : <div className="space-y-3">
                {appointments.map(appointment => <div key={appointment.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="flex items-center space-x-3">
                      <div className="bg-amber-500/20 p-2 rounded-full">
                        <User className="h-4 w-4 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-white font-medium">{appointment.client_name}</p>
                        <p className="text-slate-300 text-sm">{appointment.services_2025_12_05_15_37?.name}</p>
                        <p className="text-slate-400 text-xs">{appointment.client_phone}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white">{format(new Date(appointment.appointment_date), 'dd/MM/yyyy', {
                    locale: es
                  })}</p>
                      <p className="text-slate-300 text-sm">{appointment.appointment_time}</p>
                      <Badge className={`${getStatusColor(appointment.status)} text-white text-xs`}>
                        {getStatusText(appointment.status)}
                      </Badge>
                    </div>
                  </div>)}
              </div>}
          </CardContent>
        </Card>
      </div>
    </div>;
};
export default Admin;