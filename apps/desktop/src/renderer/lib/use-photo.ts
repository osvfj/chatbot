import { useQuery } from "@tanstack/react-query";
import { api } from "./backend";

async function loadPhoto(id: string): Promise<string> {
  const blob = await api.fetchPhoto(id);
  return URL.createObjectURL(blob);
}

export function usePhotoUrl(fotoId: string | undefined): string {
  const { data } = useQuery({
    queryKey: ["photo", fotoId ?? "none"],
    queryFn: () => (fotoId === undefined ? Promise.resolve("") : loadPhoto(fotoId)),
    enabled: fotoId !== undefined,
  });
  return data ?? "";
}
