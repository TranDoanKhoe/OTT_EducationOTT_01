import axios from "axios";

const API_BASE_URL = "/api/resources";

// Centralized API helpers for document manager features.

// Lấy danh sách tài liệu của user
export const getResources = async (token, category = "all") => {
  try {
    const response = await axios.get(`${API_BASE_URL}/list`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: { category },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching resources:", error);
    // Trả về mảng rỗng nếu API chưa có
    return [];
  }
};

// Upload tài liệu
export const uploadResource = async (file, token, folderId = null) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    if (folderId) {
      formData.append("folderId", folderId);
    }

    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error uploading resource:", error);
    throw error;
  }
};

// Tạo thư mục
export const createFolder = async (name, parentId, token) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/folder`,
      { name, parentId },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error creating folder:", error);
    throw error;
  }
};

// Xóa tài liệu
export const deleteResource = async (resourceId, token) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/${resourceId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error deleting resource:", error);
    throw error;
  }
};

// Download tài liệu
export const downloadResource = async (resourceId, token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/download/${resourceId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      responseType: "blob",
    });
    return response.data;
  } catch (error) {
    console.error("Error downloading resource:", error);
    throw error;
  }
};

// Chia sẻ tài liệu với user/group
export const shareResource = async (
  resourceId,
  targetId,
  targetType,
  token,
) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/share`,
      { resourceId, targetId, targetType },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error sharing resource:", error);
    throw error;
  }
};

// Lấy thông tin dung lượng
export const getStorageInfo = async (token) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/storage`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching storage info:", error);
    return { used: 0, total: 5 * 1024 * 1024 * 1024 }; // Default 5GB
  }
};

// Helper: Lấy loại file từ filename hoặc MIME type
export const getFileCategory = (fileNameOrMimeType) => {
  if (!fileNameOrMimeType) return "documents";

  const str = fileNameOrMimeType.toLowerCase();

  // Check by extension
  const ext = str.split(".").pop();

  // Images
  if (
    ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext) ||
    str.startsWith("image/")
  ) {
    return "images";
  }

  // Videos
  if (
    ["mp4", "avi", "mov", "wmv", "mkv", "flv", "webm"].includes(ext) ||
    str.startsWith("video/")
  ) {
    return "videos";
  }

  // Audio
  if (
    ["mp3", "wav", "flac", "ogg", "aac", "m4a", "wma"].includes(ext) ||
    str.startsWith("audio/")
  ) {
    return "audio";
  }

  // Documents (default)
  return "documents";
};

// Helper: Format file size
export const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
