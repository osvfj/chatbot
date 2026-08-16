import { useState, type FormEvent } from "react";
import { useAtom } from "@effect/atom-react";
import { useMutation } from "@tanstack/react-query";
import { CoffeeIcon } from "lucide-react";
import { Button } from "@cafebot/ui/components/button";
import { Input } from "@cafebot/ui/components/input";
import { Label } from "@cafebot/ui/components/label";
import { Spinner } from "@cafebot/ui/components/spinner";
import { api, clearToken, setToken } from "./backend";
import { sessionAtom } from "./atoms";
import { useMessages } from "./use-language";

export function useSession() {
  const [session, setSession] = useAtom(sessionAtom);
  return {
    session,
    logout: (): void => {
      clearToken();
      setSession(null);
    },
    apply: (token: string, value: unknown): void => {
      setToken(token);
      setSession(value as never);
    },
  };
}

export function LoginScreen() {
  const m = useMessages();
  const [, setSession] = useAtom(sessionAtom);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [finca, setFinca] = useState("");
  const [region, setRegion] = useState("");
  const [nombre, setNombre] = useState("");

  const login = useMutation({
    mutationFn: () => api.login({ email, password }),
    onSuccess: (session) => {
      setToken(session.token);
      setSession(session);
    },
  });

  const register = useMutation({
    mutationFn: () => api.register({ finca_nombre: finca, region, nombre, email, password }),
    onSuccess: (session) => {
      setToken(session.token);
      setSession(session);
    },
  });

  const error = login.isError || register.isError;
  const busy = login.isPending || register.isPending;

  const submit = (event: FormEvent): void => {
    event.preventDefault();
    if (mode === "login") {
      login.mutate();
    } else {
      register.mutate();
    }
  };

  const switchMode = (next: "login" | "register"): void => {
    setMode(next);
    login.reset();
    register.reset();
  };

  return (
    <div className="flex h-svh items-center justify-center bg-background p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="mb-5 flex flex-col items-center gap-2 text-center">
          <div className="flex size-11 items-center justify-center border-2 border-foreground bg-primary text-primary-foreground shadow-sm">
            <CoffeeIcon className="size-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">{m.authWelcomeTitle()}</h1>
          <p className="text-sm text-muted-foreground">{m.authWelcomeSubtitle()}</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={
              "rounded-md px-2 py-1.5 text-sm font-medium transition-colors " +
              (mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground")
            }
          >
            {m.authLoginTab()}
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={
              "rounded-md px-2 py-1.5 text-sm font-medium transition-colors " +
              (mode === "register" ? "bg-card shadow-sm" : "text-muted-foreground")
            }
          >
            {m.authRegisterTab()}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {mode === "register" && (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auth-finca">{m.authFinca()}</Label>
                <Input
                  id="auth-finca"
                  value={finca}
                  onChange={(e) => setFinca(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auth-region">{m.authRegion()}</Label>
                <Input
                  id="auth-region"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="auth-name">{m.authName()}</Label>
                <Input
                  id="auth-name"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
            </>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-email">{m.authEmail()}</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-password">{m.authPassword()}</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{m.authError()}</p>}
          <Button type="submit" disabled={busy} className="mt-1 w-full">
            {busy ? <Spinner className="size-4" /> : null}
            {mode === "login" ? m.authLogin() : m.authRegister()}
          </Button>
        </div>
      </form>
    </div>
  );
}
