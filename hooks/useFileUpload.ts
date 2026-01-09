import { useCallback, useRef } from "react";
import { FileUploadItem, UploadConfiguration } from "../types/upload";
import { uploadPdf } from "../actions/documents/upload-pdf";

interface UploadController {
  abortControllers: Map<string, AbortController>;
  onProgress?: (id: string, progress: number) => void;
  onStatusChange?: (
    id: string,
    status: FileUploadItem["status"],
    error?: string,
  ) => void;
}

export function useFileUpload() {
  const controllerRef = useRef<UploadController>({
    abortControllers: new Map(),
  });

  const uploadSingleFile = useCallback(
    async (
      item: FileUploadItem,
      config: UploadConfiguration,
    ): Promise<{ success: boolean; documentId?: string; error?: string }> => {
      const abortController = new AbortController();
      controllerRef.current.abortControllers.set(item.id, abortController);

      try {
        const result = await uploadPdf({
          courseId: config.courseId!,
          file: item.file,
          fileName: item.file.name,
          documentType: config.documentType,
        });

        if (!result.success) {
          return { success: false, error: result.message };
        }

        return { success: true, documentId: result.documentId };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          return { success: false, error: "Upload cancelled" };
        }
        return { success: false, error: "Upload failed" };
      } finally {
        controllerRef.current.abortControllers.delete(item.id);
      }
    },
    [],
  );

  const updateItemStatus = useCallback(
    (
      items: FileUploadItem[],
      id: string,
      status: FileUploadItem["status"],
      progress?: number,
      error?: string,
      documentId?: string,
    ) => {
      const item = items.find((i) => i.id === id);
      if (item) {
        item.status = status;
        if (progress !== undefined) {
          item.progress = progress;
        }
        if (error !== undefined) {
          item.error = error;
        }
        if (documentId !== undefined) {
          item.documentId = documentId;
        }
        controllerRef.current.onStatusChange?.(id, status, error);
        if (status === "uploading" && progress !== undefined) {
          controllerRef.current.onProgress?.(id, progress);
        }
      }
    },
    [],
  );

  const uploadFiles = useCallback(
    async (
      items: FileUploadItem[],
      config: UploadConfiguration,
    ): Promise<void> => {
      const uploadPromises = items
        .filter((item) => item.status === "pending")
        .map(async (item) => {
          updateItemStatus(items, item.id, "uploading", 0);

          try {
            const result = await uploadSingleFile(item, config);

            if (result.success) {
              updateItemStatus(
                items,
                item.id,
                "success",
                100,
                undefined,
                result.documentId,
              );
            } else {
              updateItemStatus(items, item.id, "error", 0, result.error);
            }
          } catch (error) {
            updateItemStatus(
              items,
              item.id,
              "error",
              0,
              error instanceof Error ? error.message : "Upload failed",
            );
          }
        });

      await Promise.allSettled(uploadPromises);
    },
    [uploadSingleFile, updateItemStatus],
  );

  const cancelUpload = useCallback((id: string): void => {
    const abortController = controllerRef.current.abortControllers.get(id);
    if (abortController) {
      abortController.abort();
      controllerRef.current.abortControllers.delete(id);
    }
  }, []);

  const resetUpload = useCallback(
    (id: string, items?: FileUploadItem[]): void => {
      cancelUpload(id);
      if (items) {
        const item = items.find((i) => i.id === id);
        if (item) {
          item.status = "pending";
          item.progress = 0;
          item.error = undefined;
          item.documentId = undefined;
          controllerRef.current.onStatusChange?.(id, "pending");
        }
      }
    },
    [cancelUpload],
  );

  const retryUpload = useCallback(
    async (
      id: string,
      config: UploadConfiguration,
      items?: FileUploadItem[],
    ): Promise<void> => {
      if (!items) return;

      const item = items.find((i) => i.id === id);
      if (!item) return;

      item.status = "pending";
      item.progress = 0;
      item.error = undefined;
      item.documentId = undefined;
      controllerRef.current.onStatusChange?.(id, "pending");

      await uploadFiles([item], config);
    },
    [uploadFiles],
  );

  const setProgressCallback = useCallback(
    (callback: (id: string, progress: number) => void) => {
      controllerRef.current.onProgress = callback;
    },
    [],
  );

  const setStatusCallback = useCallback(
    (
      callback: (
        id: string,
        status: FileUploadItem["status"],
        error?: string,
      ) => void,
    ) => {
      controllerRef.current.onStatusChange = callback;
    },
    [],
  );

  return {
    uploadFiles,
    cancelUpload,
    resetUpload,
    retryUpload,
    setProgressCallback,
    setStatusCallback,
  };
}
