import apiClient from "./client";

export type AttachmentInput = {
  uri?: string;
  url?: string;
  name?: string;
  type?: "image" | "file" | "other";
  publicId?: string;
  resourceType?: string;
};

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
};

export async function listConversations(): Promise<ApiResponse> {
  try {
    const res = await apiClient.get("/api/messages/conversations");
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error:
        error.userMessage || error.message || "Failed to list conversations",
    };
  }
}

export async function fetchConversation(
  scope: "user" | "unit",
  id: string,
): Promise<ApiResponse> {
  try {
    const res = await apiClient.get(
      `/api/messages/conversation/${scope}/${id}`,
    );
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error:
        error.userMessage || error.message || "Failed to fetch conversation",
    };
  }
}

export async function markRead(
  scope: "user" | "unit",
  id: string,
): Promise<ApiResponse> {
  try {
    const res = await apiClient.post("/api/messages/mark-read", { scope, id });
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.userMessage || error.message || "Failed to mark as read",
    };
  }
}

export async function deleteConversation(
  scope: "user" | "unit",
  id: string,
): Promise<ApiResponse> {
  try {
    const res = await apiClient.delete("/api/messages/conversation", {
      data: { scope, id },
    });
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error:
        error.userMessage || error.message || "Failed to delete conversation",
    };
  }
}

export async function sendMessage(payload: {
  toUserId?: string;
  toUnitId?: string;
  subject?: string;
  text?: string;
  attachments?: AttachmentInput[];
}): Promise<ApiResponse> {
  try {
    const res = await apiClient.post("/api/messages", payload);
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.userMessage || error.message || "Failed to send message",
    };
  }
}

export async function replyMessage(
  replyToId: string,
  payload: { text?: string; attachments?: AttachmentInput[] },
): Promise<ApiResponse> {
  try {
    const res = await apiClient.post(
      `/api/messages/${replyToId}/reply`,
      payload,
    );
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.userMessage || error.message || "Failed to reply to message",
    };
  }
}

export async function uploadMessageFile(file: {
  uri: string;
  blob?: Blob;
  name?: string;
  type?: string;
}): Promise<
  ApiResponse<{
    ok: boolean;
    url: string;
    public_id?: string;
    resource_type?: string;
  }>
> {
  try {
    const form = new FormData();
    const filename = file.name || "upload";
    
    let fileToUpload: any = file.blob;
    if (!fileToUpload && file.uri.startsWith('blob:')) {
      // If we only have a blob URI, fetch the blob
      const res = await fetch(file.uri);
      fileToUpload = await res.blob();
    }

    if (fileToUpload) {
      form.append("file", fileToUpload, filename);
    } else {
      // Fallback for RN or other cases if needed, though this is WebPWA
      form.append("file", {
        uri: file.uri,
        name: filename,
        type: file.type || "application/octet-stream",
      } as any);
    }

    const res = await apiClient.post("/api/upload/message", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.userMessage || error.message || "Failed to upload file",
    };
  }
}

export async function deleteMessage(id: string): Promise<ApiResponse> {
  try {
    const res = await apiClient.delete(`/api/messages/${id}`);
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.userMessage || error.message || "Failed to delete message",
    };
  }
}

export async function addReaction(
  id: string,
  emoji: string,
): Promise<ApiResponse> {
  try {
    const res = await apiClient.post(`/api/messages/${id}/reactions`, {
      emoji,
    });
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.userMessage || error.message || "Failed to add reaction",
    };
  }
}

export async function removeReaction(
  id: string,
  emoji: string,
): Promise<ApiResponse> {
  try {
    const res = await apiClient.delete(`/api/messages/${id}/reactions`, {
      data: { emoji },
    });
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.userMessage || error.message || "Failed to remove reaction",
    };
  }
}

export async function getUnreadCount(): Promise<
  ApiResponse<{ unreadCount: number }>
> {
  try {
    const res = await apiClient.get("/api/messages/unread-count");
    return { success: true, data: res.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.userMessage || error.message || "Failed to get unread count",
    };
  }
}
