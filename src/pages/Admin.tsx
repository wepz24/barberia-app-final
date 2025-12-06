import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, CheckCircle, XCircle, LogOut, Clock, Phone, User, Scissors } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Appointment {
  id: string;
  client_name: string;
  client_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string;
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

    // Suscripción Realtime (Simple y Robusta)
    const channel = supabase
      .channel('public:appointments_2025_12_05_15_37') // Nombre de canal único
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar TODO (Insert, Update, Delete)
          schema: 'public',
          table: 'appointments_2025_12_05_15_37'
        },
        (payload) => {
          console.log("🔔 Cambio en Realtime recibido:", payload);
          // Al recibir un cambio, recargamos la lista para asegurar sincronización
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

      if (error) {
        console.error("Error fetching:", error);
      } else {
        setAppointments(data || []);
      }
    } catch (error) {
      console.error("Error general:", error);
    } finally {
      setLoading(false);
    }
  };

  // Función para actualizar estado (Con cambio VISUAL inmediato)
  const updateStatus = async (id: string, newStatus: string) => {
    // 1. GUARDAR EL ESTADO ANTERIOR (por si falla)
    const previousAppointments = [...appointments];

    // 2. CAMBIO VISUAL INMEDIATO (Optimista)
    // Esto hace que el botón cambie al instante sin esperar a la base de datos
    setAppointments(currentAppointments => 
      currentAppointments.map(app => 
        app.id === id ? { ...app, status: newStatus } : app
      )
    );

    try {
      // 3. ENVIAR A LA BASE DE DATOS
      const { error } = await supabase
        .from("appointments_2025_12_05_15_37")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      toast.success(newStatus === 'confirmed' ? '¡Cita Confirmada!' : 'Cita rechazada/cancelada');
      
    } catch (error) {
      // 4. SI FALLA, REVERTIMOS EL CAMBIO
      console.error("Error actualizando DB:", error);
      setAppointments(previousAppointments);
      toast.error("Error al guardar el cambio. Verifica tu conexión.");
    }
  };

  const handleLogout = () => {
    navigate("/");
  };

  // Estilos de estado
  const getStatusColor = (status: string) => {
    if (status === 'confirmed') return "bg-green-100 text-green-700 border-green-200";
    if (status === 'cancelled') return "bg-red-100 text-red-700 border-red-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  const getStatusText = (status: string) => {
    if (status === 'confirmed') return "Confirmado";
    if (status === 'cancelled') return "Rechazado";
    return "Pendiente";
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Admin */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg">
               <Scissors className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Portal del Barbero</h1>
              <p className="text-slate-500 text-sm">Administración de citas</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-100 hover:bg-red-50">
            <LogOut className="mr-2 h-4 w-4" />
            Salir
          </Button>
        </div>

        {/* Lista de Citas */}
        <div className="grid gap-4">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Cargando reservas...</div>
          ) : appointments.length === 0 ? (
            <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
              <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Calendar className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-lg font-medium">No tienes citas pendientes</p>
              </CardContent>
            </Card>
          ) : (
            appointments.map((appointment) => (
              <Card key={appointment.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    
                    {/* Fecha */}
                    <div className="bg-slate-50 p-6 flex flex-col justify-center items-center md:w-40 border-b md:border-b-0 md:border-r border-slate-100">
                      <span className="text-4xl font-black text-slate-700 tracking-tighter">
                        {format(new Date(appointment.appointment_date + 'T00:00:00'), 'dd')}
                      </span>
                      <span className="text-xs uppercase font-bold text-slate-400 tracking-widest mb-3">
                        {format(new Date(appointment.appointment_date + 'T00:00:00'), 'MMM', { locale: es })}
                      </span>
                      <div className="flex items-center text-slate-700 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-sm font-bold shadow-sm">
                        <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                        {appointment.appointment_time}
                      </div>
                    </div>

                    {/* Detalles */}
                    <div className="flex-1 p-6 flex flex-col justify-center space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                             <User className="w-4 h-4 text-slate-400" />
                             {appointment.client_name}
                          </h3>
                          <a href={`tel:${appointment.client_phone}`} className="text-slate-500 text-sm flex items-center gap-2 hover:text-amber-600 transition-colors mt-1">
                            <Phone className="w-3.5 h-3.5" /> {appointment.client_phone}
                          </a>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusColor(appointment.status)}`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                      
                      <div className="bg-slate-50 rounded-lg p-3 text-sm border border-slate-100">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-slate-500 font-medium">Servicio</span>
                           <span className="text-slate-900 font-bold">{appointment.services_2025_12_05_15_37?.name}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-slate-500 font-medium">Total</span>
                           <span className="text-amber-600 font-bold">${appointment.services_2025_12_05_15_37?.price.toLocaleString()} CLP</span>
                        </div>
                        {appointment.notes && (
                           <div className="mt-2 pt-2 border-t border-slate-200 text-slate-500 italic text-xs">
                              Nota: "{appointment.notes}"
                           </div>
                        )}
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="p-4 flex flex-row md:flex-col gap-3 justify-center border-t md:border-t-0 md:border-l border-slate-100 bg-slate-50/50 md:w-52">
                      {appointment.status === 'pending' && (
                        <>
                          <Button 
                            onClick={() => updateStatus(appointment.id, 'confirmed')}
                            className="bg-slate-900 hover:bg-slate-800 text-white w-full shadow-sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Confirmar
                          </Button>
                          <Button 
                            onClick={() => updateStatus(appointment.id, 'cancelled')}
                            variant="outline"
                            className="w-full border-slate-200 text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100"
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Rechazar
                          </Button>
                        </>
                      )}
                      
                      {appointment.status === 'confirmed' && (
                        <Button 
                          onClick={() => updateStatus(appointment.id, 'cancelled')}
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 w-full"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Cancelar Cita
                        </Button>
                      )}
                      
                      {appointment.status === 'cancelled' && (
                        <Button 
                          onClick={() => updateStatus(appointment.id, 'pending')}
                          variant="ghost"
                          className="text-slate-400 hover:text-slate-600 w-full"
                          size="sm"
                        >
                          Restaurar a Pendiente
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