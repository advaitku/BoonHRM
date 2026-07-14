import { requireAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UserRowActions } from "@/components/admin/user-row-actions";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function UsersPage() {
  const session = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-muted-foreground">
            Create HR and admin accounts. Sign-in is by one-time email code.
          </p>
        </div>
        <CreateUserForm />
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>
                    {u.role === "admin" ? "Admin" : "HR"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.banned ? (
                    <Badge variant="destructive">Disabled</Badge>
                  ) : (
                    <Badge variant="outline">Active</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <UserRowActions
                    userId={u.id}
                    role={u.role}
                    banned={u.banned}
                    isSelf={u.id === session.user.id}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
