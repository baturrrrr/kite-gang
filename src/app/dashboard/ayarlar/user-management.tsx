"use client";

import { Badge } from "@/components/ui/badge";
import { ROLE_LABELS } from "@/lib/constants";

export function UserManagement({ users }: { users: any[] }) {
  return (
    <div className="divide-y">
      {users.map((u) => (
        <div key={u.id} className="py-3 flex justify-between items-center">
          <div>
            <p className="font-medium text-sm">{u.name}</p>
            <p className="text-xs text-gray-500">{u.email}</p>
          </div>
          <Badge variant={u.role === "ADMIN" ? "default" : "secondary"}>
            {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS]}
          </Badge>
        </div>
      ))}
    </div>
  );
}
