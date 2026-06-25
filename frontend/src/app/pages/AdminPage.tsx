import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { fetchPendingClassApplications } from "@/features/classes/api/get-pending-class-applications";
import { fetchAllSchoolClasses } from "@/features/classes/api/get-all-school-classes";
import { fetchAllFundraisers } from "@/features/fundraisers/api/get-all-fundraisers";
import { fetchAllUsersWithChildren } from "@/features/users/api/get-users-all";

export function AdminPage() {
  const { data: applications = [] } = useQuery({
    queryKey: ["pending-class-applications"],
    queryFn: fetchPendingClassApplications,
  });
  const { data: users = [] } = useQuery({
    queryKey: ["all-users-with-children"],
    queryFn: fetchAllUsersWithChildren,
  });
  const { data: classes = [] } = useQuery({
    queryKey: ["all-school-classes"],
    queryFn: fetchAllSchoolClasses,
  });
  const { data: fundraisers = [] } = useQuery({
    queryKey: ["all-fundraisers"],
    queryFn: fetchAllFundraisers,
  });

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Pulpit administratora</h1>
        <p className="text-muted-foreground">
          Operacje systemowe i moderacja zgodnie z uprawnieniami backendu
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Wnioski o klasy" value={applications.length} to="/admin/class-applications" />
        <StatCard title="Użytkownicy" value={users.length} to="/admin/users" />
        <StatCard title="Klasy" value={classes.length} to="/admin/classes" />
        <StatCard title="Zbiórki" value={fundraisers.length} to="/admin/fundraisers" />
      </div>
    </section>
  );
}

function StatCard({
  title,
  value,
  to,
}: {
  title: string;
  value: number;
  to: string;
}) {
  return (
    <Link to={to} className="block rounded-xl border bg-card p-5 transition-colors hover:bg-muted/50">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </Link>
  );
}
