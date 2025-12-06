import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, CheckCircle, XCircle, LogOut, Clock, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_id: string;
  services_2025_12_05_15_37: {
    name: string;
    price: number;
  };
}

const Admin = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();

    // Suscripción en tiempo real para el Admin también
    const channel = supabase
      .channel('admin-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments_2025_12_05_15_37' },
        (payload) => {
          fetchAppointments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from("appointments_2025_12_05_15_37")
        .select(`
          *,
          services_2025_12_05_15_37 (
            name,
            price
          )
        `)
        .order("appointment_date", { ascending: true })
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      setAppointments(data || []);
    } catch (error) {
      console.error("Error cargando citas:", error);
      toast.error("Error al cargar las citas");
    } finally {
      setLoading(false);
    }
  };

  // ESTA ES LA FUNCIÓN QUE HACE MAGIA CON LOS BOTONES
  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("appointments_2025_12_05_15_37")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Cita ${newStatus === 'confirmed' ? 'confirmada' : 'cancelada'} exitosamente`);
      fetchAppointments(); // Recargar la lista visualmente
    } catch (error) {
      console.error("Error actualizando:", error);
      toast.error("No se pudo actualizar el estado");
    }
  };

  const handleLogout = () => {
    // Aquí podrías agregar lógica de logout de supabase si usaras Auth real
    navigate("/");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed": return "bg-green-100 text-green-800 border-green-200";
      case "cancelled": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-yellow-100 text-yellow-800 border-yellow-200";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "confirmed": return "Confirmado";
      case "cancelled": return "Cancelado";
      default: return "Pendiente";
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Admin */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Panel de Administración</h1>
            <p className="text-slate-500">Gestiona tus reservas en tiempo real</p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
            <LogOut className="mr-2 h-4 w-4" />
            Salir al Inicio
          </Button>
        </div>

        {/* Lista de Citas */}
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-10">Cargando reservas...</div>
          ) : appointments.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-slate-500">
                <Calendar className="h-12 w-12 mb-2 opacity-20" />
                <p>No hay citas registradas aún.</p>
              </CardContent>
            </Card>
          ) : (
            appointments.map((appointment) => (
              <Card key={appointment.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    
                    {/* Fecha y Hora (Lateral Izquierdo) */}
                    <div className="bg-slate-100 p-6 flex flex-col justify-center items-center md:w-48 border-b md:border-b-0 md:border-r border-slate-200">
                      <span className="text-3xl font-bold text-slate-700">
                        {format(new Date(appointment.appointment_date + 'T00:00:00'), 'dd', { locale: es })}
                      </span>
                      <span className="text-sm uppercase font-semibold text-slate-500 mb-2">
                        {format(new Date(appointment.appointment_date + 'T00:00:00'), 'MMM', { locale: es })}
                      </span>
                      <div className="flex items-center text-slate-900 font-mono bg-white px-3 py-1 rounded-full border border-slate-200">
                        <Clock className="w-3 h-3 mr-2" />
                        {appointment.appointment_time}
                      </div>
                    </div>

                    {/* Detalles de la Cita */}
                    <div className="flex-1 p-6 flex flex-col justify-center">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">{appointment.client_name}</h3>
                          <p className="text-slate-500 text-sm flex items-center gap-2">
                            📞 {appointment.client_phone}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(appointment.status)}`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm text-slate-600">
                        <p><strong>Servicio:</strong> {appointment.services_2025_12_05_15_37?.name} - ${appointment.services_2025_12_05_15_37?.price.toLocaleString()} CLP</p>
                        {appointment.status === 'cancelled' && (
                          <p className="text-red-500 text-xs mt-1">Esta hora ya está liberada para otros clientes.</p>
                        )}
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="p-4 flex flex-row md:flex-col gap-2 justify-center border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/50 md:w-48">
                      {appointment.status === 'pending' && (
                        <>
                          <Button 
                            onClick={() => updateStatus(appointment.id, 'confirmed')}
                            className="bg-green-600 hover:bg-green-700 text-white w-full"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Confirmar
                          </Button>
                          <Button 
                            onClick={() => updateStatus(appointment.id, 'cancelled')}
                            variant="destructive"
                            className="w-full"
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Rechazar
                          </Button>
                        </>
                      )}
                      {appointment.status === 'confirmed' && (
                        <Button 
                          onClick={() => updateStatus(appointment.id, 'cancelled')}
                          variant="outline"
                          className="text-red-600 border-red-200 hover:bg-red-50 w-full"
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Cancelar Cita
                        </Button>
                      )}
                      {appointment.status === 'cancelled' && (
                        <Button 
                          onClick={() => updateStatus(appointment.id, 'pending')}
                          variant="ghost"
                          className="text-slate-500 w-full"
                        >
                          Restaurar
                        </Button>
                      )}
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;