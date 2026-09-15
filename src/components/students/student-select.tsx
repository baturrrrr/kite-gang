"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Search } from "lucide-react";
import { createQuickStudent } from "@/app/actions/students";
import { toast } from "sonner";

type Student = { id: string; firstName: string; lastName: string };

const AVATAR_COLORS = [
  "bg-warning/15 text-warning",
  "bg-info/15 text-info",
  "bg-success/15 text-success",
  "bg-info/15 text-info",
  "bg-destructive/15 text-destructive",
  "bg-info/15 text-info",
];

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function StudentSelect({
  students,
  value,
  onChange,
  name = "studentId",
  required = true,
  label = "Müşteri *",
  onModeChange,
}: {
  students: Student[];
  value: string;
  onChange: (id: string) => void;
  name?: string;
  required?: boolean;
  label?: string;
  onModeChange?: (isCreatingNew: boolean) => void;
}) {
  const [localStudents, setLocalStudents] = useState(students);
  const [showNew, setShowNewRaw] = useState(false);
  function setShowNew(v: boolean) {
    setShowNewRaw(v);
    onModeChange?.(v);
  }
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [picking, setPicking] = useState(false);

  const selected = localStudents.find((s) => s.id === value) ?? null;

  function handleSelectChange(v: string) {
    if (v === "__new__") {
      setShowNew(true);
      setError("");
    } else {
      onChange(v);
      setPicking(false);
    }
  }

  function handleCreate() {
    setError("");
    const fd = new FormData();
    fd.set("firstName", firstName);
    fd.set("lastName", lastName);
    fd.set("phone", phone);
    fd.set("email", email);
    startTransition(async () => {
      const result = await createQuickStudent({}, fd);
      if (result.fieldErrors || result.error) {
        setError(Object.values(result.fieldErrors ?? {}).flat()[0] ?? result.error ?? "Müşteri eklenemedi");
        return;
      }
      if (result.studentId) {
        setLocalStudents((prev) => [{ id: result.studentId!, firstName, lastName }, ...prev]);
        onChange(result.studentId);
        setShowNew(false);
        setPicking(false);
        setFirstName("");
        setLastName("");
        setPhone("");
        setEmail("");
        toast.success("Müşteri eklendi");
      }
    });
  }

  if (showNew) {
    return (
      <div className="space-y-3 border rounded-xl p-4 bg-muted/40">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <UserPlus className="w-3.5 h-3.5" /> Yeni Müşteri
          </Label>
          <button type="button" onClick={() => setShowNew(false)} className="text-xs text-info hover:underline">
            ← Listeden seç
          </button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Ad *" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input placeholder="Soyad *" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input placeholder="E-posta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <Button
          type="button"
          size="sm"
          className="w-full"
          disabled={isPending || !firstName || !lastName}
          onClick={handleCreate}
        >
          {isPending ? "Ekleniyor..." : "Müşteriyi Ekle ve Seç"}
        </Button>
      </div>
    );
  }

  // Seçili müşteri var ve seçim modunda değilsek: özet kart + Değiştir
  if (selected && !picking) {
    return (
      <div className="space-y-1.5">
        <Label>{label}</Label>
        <input type="hidden" name={name} value={value} required={required} />
        <div className="flex items-center justify-between gap-3 border rounded-xl px-3.5 py-2.5 bg-card">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${colorFor(selected.id)}`}>
              {initialsOf(selected.firstName, selected.lastName)}
            </div>
            <p className="font-medium text-foreground truncate">{selected.firstName} {selected.lastName}</p>
          </div>
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="text-xs font-medium text-info hover:underline flex-shrink-0"
          >
            Değiştir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
        <select
          name={name}
          className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-card"
          required={required}
          value={value}
          onChange={(e) => handleSelectChange(e.target.value)}
        >
          <option value="">Müşteri seçin...</option>
          <option value="__new__">+ Yeni Müşteri Ekle</option>
          {localStudents.map((s) => (
            <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
