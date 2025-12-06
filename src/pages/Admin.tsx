import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import bcrypt from 'bcryptjs'; // <--- Importamos la seguridad real

const Admin = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adminInfo, setAdminInfo] = useState(null);

  useEffect(() => {
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
      console.log("Buscando usuario:", email);
      
      // 1. Buscamos el usuario en Supabase (SOLO por email)
      const { data: user, error } = await supabase
        .from('admin_users_2025_12_05_15_37')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error("Error DB:", error);
        toast.error('Error de conexión');
        setLoading(false);
        return;
      }

      if (!user) {
        toast.error('Usuario no encontrado');
        setLoading(false);
        return;
      }

      // 2. Verificamos el rol
      if (user.role !== 'barber') {
        toast.error('No tienes permisos de barbero');
        setLoading(false);
        return;
      }

      // 3. LA MAGIA: Comparamos la contraseña escrita con el HASH de la base de datos
      console.log("Verificando hash...");
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (!passwordMatch) {
        toast.error('Contraseña incorrecta');
        setLoading(false);
        return;
      }

      // 4. Si llegamos aquí, ¡ENTRASTE!
      const token = btoa(`${user.id}:${Date.now()}`);
      localStorage.setItem('admin_token', token);
      localStorage.setItem('admin_info', JSON.stringify(user));
      
      setIsAuthenticated(true);
      setAdminInfo(user);
      toast.success(`Bienvenido ${user.name}`);
      fetchAppointments();

    } catch (error) {
      console.error("Error crítico:", error);
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
      .select(`*, services_2025_12_05_15_37 (name, price, duration_minutes)`)
      .order('appointment_date', { ascending: true });

    if (error) toast.error('Error al cargar citas');
    else setAppointments(data || []);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Panel de Administración</h2>
            <p className="mt-2 text-slate-400">Acceso seguro con verificación real</p>
          </div>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Iniciar Sesión</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
              </div>
              <div className="space-y-2">
                <Label className="text-white">Contraseña</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-slate-900 border-slate-700 text-white" />
              </div>
              <Button onClick={handleLogin} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold">
                {loading ? 'Verificando...' : 'Entrar'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-8 text-white">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Panel de Control - {adminInfo?.name}</h1>
        <Button onClick={handleLogout} variant="destructive">Cerrar Sesión</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
         <Card className="bg-slate-800 border-slate-700">
            <CardHeader><CardTitle className="text-white">Citas Cargadas</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-white">{appointments.length}</p></CardContent>
         </Card>
      </div>
    </div>
  );
};

export default Admin;