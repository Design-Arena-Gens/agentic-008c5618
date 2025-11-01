"use client";

import { FormEvent, useMemo, useState } from "react";
import { buildMessage, type AgentProfile, type Contact } from "@/lib/message";

type SendLog = {
  contactId: string;
  name: string;
  status: "pending" | "sent" | "error";
  detail?: string;
};

const defaultProfile: AgentProfile = {
  name: "Jordan",
  role: "Founder",
  vibe: "warm, proactive, thoughtful",
  opener: "Hey {firstName}! It’s {agentName}.",
  signature: "Talk soon, {agentName}",
};

const seedContacts: Contact[] = [
  {
    id: "contact-1",
    name: "Alex Rivera",
    phone: "+15555550123",
    company: "Rivera Holdings",
    notes: "Asked about the new concierge package last week.",
  },
  {
    id: "contact-2",
    name: "Priya Shah",
    phone: "+15555550124",
    company: "Lotus Co.",
    notes: "Needs follow-up on onboarding questions.",
  },
  {
    id: "contact-3",
    name: "Marcus Lee",
    phone: "+15555550125",
    company: "Summit Labs",
    notes: "Long-time client who appreciates quick updates.",
  },
];

export default function Home() {
  const [profile, setProfile] = useState<AgentProfile>(defaultProfile);
  const [messageTemplate, setMessageTemplate] = useState(
    "Just wanted to personally check in about {notes}. Does {company} need anything from me right now?"
  );
  const [contacts, setContacts] = useState<Contact[]>(seedContacts);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(seedContacts.map((contact) => contact.id))
  );
  const [newContact, setNewContact] = useState({
    name: "",
    phone: "",
    company: "",
    notes: "",
  });
  const [isSending, setIsSending] = useState(false);
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);

  const activeContacts = useMemo(
    () => contacts.filter((contact) => selectedIds.has(contact.id)),
    [contacts, selectedIds]
  );

  const previewSample = activeContacts[0] ?? contacts[0];
  const previewMessage = useMemo(() => {
    if (!previewSample) return "Add a contact to preview your message.";
    return buildMessage({
      profile,
      contact: previewSample,
      template: messageTemplate,
    });
  }, [profile, previewSample, messageTemplate]);

  const toggleContact = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContactSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = newContact.name.trim();
    const trimmedPhone = newContact.phone.trim();
    if (!trimmedName || !trimmedPhone) {
      return;
    }
    const created: Contact = {
      id: crypto.randomUUID(),
      name: trimmedName,
      phone: trimmedPhone,
      company: newContact.company.trim() || undefined,
      notes: newContact.notes.trim() || undefined,
    };
    setContacts((current) => [created, ...current]);
    setSelectedIds((current) => new Set(current).add(created.id));
    setNewContact({
      name: "",
      phone: "",
      company: "",
      notes: "",
    });
  };

  const handleSend = async () => {
    if (!activeContacts.length) return;
    setIsSending(true);
    const batchId = crypto.randomUUID();
    setLastBatchId(batchId);
    setLogs(
      activeContacts.map<SendLog>((contact) => ({
        contactId: contact.id,
        name: contact.name,
        status: "pending",
      }))
    );

    try {
      const response = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          profile,
          template: messageTemplate,
          contacts: activeContacts,
        }),
      });

      const payload = (await response.json()) as {
        results: { contactId: string; status: "sent" | "error"; detail?: string }[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to send text messages.");
      }

      setLogs((current) =>
        current.map((log) => {
          const match = payload.results.find(
            (result) => result.contactId === log.contactId
          );
          if (!match) return log;
          return {
            ...log,
            status: match.status,
            detail: match.detail,
          };
        })
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Unknown error occurred.";
      setLogs((current) =>
        current.map((log) => ({
          ...log,
          status: "error",
          detail,
        }))
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10 sm:py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Personal SMS Agent
        </h1>
        <p className="max-w-2xl text-base text-zinc-600">
          Craft a texting assistant that speaks in your voice, keeps track of
          context, and reaches out to clients for you.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
        <div className="grid gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Agent Persona</h2>
              <p className="text-sm text-zinc-500">
                Define how the agent introduces itself and signs off to stay on
                brand.
              </p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-zinc-700">Name</span>
                <input
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  value={profile.name}
                  onChange={(event) =>
                    setProfile((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-zinc-700">Role</span>
                <input
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  value={profile.role}
                  onChange={(event) =>
                    setProfile((prev) => ({
                      ...prev,
                      role: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
            <label className="mt-4 flex flex-col gap-2 text-sm">
              <span className="font-medium text-zinc-700">
                Personality & tone keywords
              </span>
              <input
                className="rounded-xl border border-zinc-200 px-3 py-2 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                value={profile.vibe}
                onChange={(event) =>
                  setProfile((prev) => ({
                    ...prev,
                    vibe: event.target.value,
                  }))
                }
              />
            </label>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-zinc-700">
                  Opening line (supports {"{firstName}"} etc.)
                </span>
                <input
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  value={profile.opener}
                  onChange={(event) =>
                    setProfile((prev) => ({
                      ...prev,
                      opener: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-zinc-700">
                  Signature (supports {"{firstName}"} etc.)
                </span>
                <input
                  className="rounded-xl border border-zinc-200 px-3 py-2 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  value={profile.signature}
                  onChange={(event) =>
                    setProfile((prev) => ({
                      ...prev,
                      signature: event.target.value,
                    }))
                  }
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">Message Strategy</h2>
              <p className="text-sm text-zinc-500">
                Use placeholders to personalize each text automatically.
              </p>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium text-zinc-700">
                  Message template
                </span>
                <textarea
                  className="min-h-[140px] rounded-xl border border-zinc-200 px-3 py-3 text-base outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  value={messageTemplate}
                  onChange={(event) => setMessageTemplate(event.target.value)}
                  placeholder="Example: Just checking in about {notes}. Want me to take anything off your plate?"
                />
              </label>
              <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                <p className="font-medium text-zinc-700">Available variables:</p>
                <p className="mt-1 text-xs">
                  {"{firstName}"} {"{fullName}"} {"{company}"} {"{notes}"}{" "}
                  {"{lastInteraction}"} {"{agentName}"} {"{agentRole}"}{" "}
                  {"{agentVibe}"}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">Contacts</h2>
                <p className="text-sm text-zinc-500">
                  Select who to reach out to. Numbers must be E.164 formatted.
                </p>
              </div>
              <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                {activeContacts.length} selected
              </span>
            </div>
            <div className="mt-4 space-y-3">
              {contacts.map((contact) => {
                const isSelected = selectedIds.has(contact.id);
                return (
                  <button
                    key={contact.id}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                      isSelected
                        ? "border-zinc-900 bg-zinc-950 text-white"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-300"
                    }`}
                    onClick={() => toggleContact(contact.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold">
                        {contact.name}
                      </span>
                      <span className="text-xs uppercase tracking-wide text-zinc-500">
                        {isSelected ? "Active" : "Muted"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {contact.company ?? "Independent"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {contact.phone}
                    </p>
                    {contact.notes && (
                      <p className="mt-2 text-xs text-zinc-300">
                        {contact.notes}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            <form
              className="mt-6 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4"
              onSubmit={handleContactSubmit}
            >
              <h3 className="text-sm font-semibold text-zinc-700">
                Add someone new
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <input
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="Full name"
                  value={newContact.name}
                  onChange={(event) =>
                    setNewContact((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                />
                <input
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="+15551234567"
                  value={newContact.phone}
                  onChange={(event) =>
                    setNewContact((prev) => ({
                      ...prev,
                      phone: event.target.value,
                    }))
                  }
                />
                <input
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="Company (optional)"
                  value={newContact.company}
                  onChange={(event) =>
                    setNewContact((prev) => ({
                      ...prev,
                      company: event.target.value,
                    }))
                  }
                />
                <input
                  className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10"
                  placeholder="Notes (optional)"
                  value={newContact.notes}
                  onChange={(event) =>
                    setNewContact((prev) => ({
                      ...prev,
                      notes: event.target.value,
                    }))
                  }
                />
              </div>
              <button
                type="submit"
                className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                Save contact
              </button>
            </form>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-lg font-semibold">Preview</h2>
                <p className="text-sm text-zinc-500">
                  Live view of the outbound text for the first selected contact.
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
              {previewMessage}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Send</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Messages are dispatched via Twilio using the credentials you
              provide in the deployment environment.
            </p>
            <button
              className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSending || !activeContacts.length}
              onClick={handleSend}
            >
              {isSending
                ? "Sending..."
                : `Send to ${activeContacts.length} ${
                    activeContacts.length === 1 ? "person" : "people"
                  }`}
            </button>
            {lastBatchId && (
              <p className="mt-2 text-xs uppercase tracking-wide text-zinc-400">
                Batch ID: {lastBatchId}
              </p>
            )}
            <div className="mt-4 space-y-2 text-sm">
              {logs.map((log) => (
                <div
                  key={log.contactId}
                  className={`rounded-lg border px-3 py-2 ${
                    log.status === "sent"
                      ? "border-green-200 bg-green-50 text-green-700"
                      : log.status === "error"
                      ? "border-rose-200 bg-rose-50 text-rose-700"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{log.name}</span>
                    <span className="text-xs uppercase tracking-wide">
                      {log.status === "pending"
                        ? "Sending"
                        : log.status === "sent"
                        ? "Sent"
                        : "Error"}
                    </span>
                  </div>
                  {log.detail && (
                    <p className="mt-1 text-xs opacity-80">{log.detail}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Tips</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-500">
              <li>
                Use {"{notes}"} to reference details from your most recent call
                or meeting.
              </li>
              <li>
                Provide a valid Twilio number or Messaging Service SID in your
                environment before sending.
              </li>
              <li>
                Keep opt-out language handy if contacting leads for marketing
                purposes.
              </li>
            </ul>
          </div>
        </aside>
      </section>
    </main>
  );
}
