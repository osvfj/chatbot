import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type Album, type Foto } from "./backend";

export interface PhotoCard {
  readonly foto: Foto;
  readonly imageUrl: string;
}

export interface GalleryAlbum {
  readonly album: Album;
  readonly photos: ReadonlyArray<PhotoCard>;
}

export function useAlbums() {
  return useQuery({ queryKey: ["albums"], queryFn: () => api.listAlbums() });
}

export function useAlbumPhotos(albumId: string) {
  return useQuery({
    queryKey: ["album-photos", albumId],
    queryFn: () => api.albumPhotos(albumId),
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { readonly chatId: string; readonly file: File }) =>
      api.uploadPhoto(input.chatId, input.file),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["albums"] });
    },
  });
}
