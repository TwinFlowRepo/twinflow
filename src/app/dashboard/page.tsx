import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, companies(name)")
    .eq("id", user.id)
    .single();

  const { data: customers } = await supabase
    .from("customers")
    .select("id, full_name, email, phone, created_at")
    .order("created_at", { ascending: false });

  const companyName = (profile?.companies as unknown as { name: string } | null)?.name;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div>
          <p className="text-sm text-gray-500">{companyName ?? "Tu empresa"}</p>
          <h1 className="text-lg font-semibold text-gray-900">TwinFlow</h1>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Cerrar sesión
          </button>
        </form>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Clientes</h2>
          <span className="text-sm text-gray-500">
            {customers?.length ?? 0} registrados
          </span>
        </div>

        {!customers || customers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">
              Todavía no cargaste ningún cliente.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Email</th>
                  <th className="px-4 py-2 text-left font-medium text-gray-500">Teléfono</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2 text-gray-900">{c.full_name}</td>
                    <td className="px-4 py-2 text-gray-500">{c.email ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-500">{c.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
