const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";
const DEFAULT_BACKEND_URL = "https://ott-education-be.onrender.com";
const sanitizeUrl = (value) =>
  (value || "")
    .toString()
    .trim()
    .replace(/^['\"]|['\"]$/g, "")
    .replace(/\/$/, "");

const RAW_BACKEND_URL = sanitizeUrl(import.meta.env.VITE_BACKEND_URL);
const BACKEND_BASE_URL = sanitizeUrl(
  /^https?:\/\//i.test(RAW_BACKEND_URL)
    ? RAW_BACKEND_URL
    : RAW_BACKEND_URL
      ? `http://${RAW_BACKEND_URL}`
      : DEFAULT_BACKEND_URL,
).replace(/\/api$/i, "");

const AUTH_BASE_URL = BACKEND_BASE_URL || API_BASE_URL;

import axios from "axios";

// User/account API helpers used by profile, auth-related, and social flows.
// Keep profile endpoints grouped here so Home/Profile components reuse one source.
const fetchWithTimeout = async (url, options = {}, timeoutMs = 15000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const fetchUserProfile = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/user/get-info-for-user`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch profile");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
};

export const updateUserProfile = async (data) => {
  try {
    const formData = new FormData();
    const requestData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone,
      gender: data.gender,
      birthday: data.birthday,
    };
    formData.append(
      "request",
      new Blob([JSON.stringify(requestData)], {
        type: "application/json",
      }),
    );
    if (data.avatar) {
      formData.append("avatar", data.avatar);
    }
    const response = await axios.put("/api/user/update", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Update profile failed", error);
    return null;
  }
};

export const updatePassword = async (oldPassword, newPassword) => {
  try {
    const response = await fetch(`${API_BASE_URL}/user/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: JSON.stringify({
        oldPassword,
        newPassword,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to update password");
    }
    return response.json();
  } catch (error) {
    console.error("Error updating password:", error);
    return null;
  }
};

export const uploadAvatar = async (file) => {
  try {
    const formData = new FormData();
    formData.append("avatar", file);
    const response = await fetch(`${API_BASE_URL}/user/upload-avatar`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: formData,
    });
    if (!response.ok) {
      throw new Error("Upload failed");
    }
    return response.json();
  } catch (error) {
    console.error("Upload error:", error);
    return null;
  }
};

export const fetchFriendsList = async () => {
  try {
    const response = await fetch(`/api/friend`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch friends list");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching friends list:", error);
    return null;
  }
};

export const fetchPendingFriendRequests = async () => {
  try {
    const response = await fetch(`/api/friend/requests/pending`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Failed to fetch pending friend requests",
      );
    }
    const data = await response.json();
    console.log("📩 Raw API response for pending requests:", data);
    console.log("📩 First request details:", data[0]);
    return data;
  } catch (error) {
    console.error("Error fetching pending friend requests:", error);
    return null;
  }
};

export const sendFriendRequest = async (phone) => {
  try {
    const token = localStorage.getItem("accessToken");
    console.log(
      "🔑 Token for friend request:",
      token ? token.substring(0, 50) + "..." : "NO TOKEN",
    );

    const response = await fetch(`/api/friend/send-request/${phone}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log("📡 Friend request response status:", response.status);

    if (!response.ok) {
      const responseClone = response.clone();
      try {
        const error = await response.json();
        console.error("❌ Friend request error:", error);
        throw new Error(error.message || "Gửi yêu cầu kết bạn thất bại");
      } catch (jsonError) {
        const text = await responseClone.text();
        console.error("❌ Friend request error (text):", text);
        throw new Error("Gửi yêu cầu kết bạn thất bại");
      }
    }
    return response.json();
  } catch (error) {
    console.error("Lỗi gửi yêu cầu kết bạn:", error);
    throw error;
  }
};

export const acceptFriendRequest = async (requestId) => {
  try {
    const response = await fetch(`/api/friend/request/${requestId}/accept`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorMessage = "Chấp nhận yêu cầu kết bạn thất bại";
      if (contentType && contentType.includes("application/json")) {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } else {
        const text = await response.text();
        console.warn("Non-JSON response received:", text);
        errorMessage = text || errorMessage;
      }
      throw new Error(errorMessage);
    }
    return response.json();
  } catch (error) {
    console.error("Lỗi chấp nhận yêu cầu kết bạn:", error);
    throw error;
  }
};

export const cancelFriendRequest = async (requestId) => {
  try {
    const response = await fetch(`/api/friend/request/${requestId}/cancel`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to cancel friend request");
    }

    return response.json();
  } catch (error) {
    console.error("Error canceling friend request:", error);
    return null;
  }
};

export const deleteFriend = async (friendId) => {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      throw new Error("Vui lòng đăng nhập để xóa bạn bè");
    }
    const currentUserId = localStorage.getItem("userId");
    console.log("🗑️ Attempting to delete friend:", {
      friendId,
      currentUserId,
      token: token.substring(0, 20) + "...",
    });

    if (friendId === currentUserId) {
      throw new Error("Bạn không thể xóa chính mình khỏi danh sách bạn bè");
    }
    const response = await fetch(`/api/friend/${friendId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    console.log("🗑️ Delete friend response:", {
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      let errorMessage = "Không thể xóa bạn bè";

      // Clone response để có thể đọc nhiều lần nếu cần
      const responseClone = response.clone();

      if (response.status === 403) {
        // Try to get detailed error from backend
        try {
          const errorData = await response.json();
          console.error("❌ 403 Error details:", errorData);
          errorMessage =
            errorData.message || "Bạn không có quyền xóa bạn bè này";
        } catch (e) {
          try {
            const errorText = await responseClone.text();
            console.error("❌ 403 Error text:", errorText);
            errorMessage = errorText || "Bạn không có quyền xóa bạn bè này";
          } catch (e2) {
            console.error("❌ Cannot read response:", e2);
            errorMessage = "Bạn không có quyền xóa bạn bè này";
          }
        }
      } else if (response.status === 404) {
        errorMessage = "Người dùng không tồn tại hoặc không phải bạn bè";
      } else {
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          try {
            const errorText = await responseClone.text();
            console.warn("Non-JSON response received:", errorText);
            errorMessage = errorText || errorMessage;
          } catch (e2) {
            console.warn("Cannot read response");
          }
        }
      }
      throw new Error(errorMessage);
    }
    return response.json();
  } catch (error) {
    console.error("Error deleting friend:", error);
    throw error;
  }
};

export const blockUser = async (blockedUserId) => {
  try {
    const response = await fetch(`/api/friend/block/${blockedUserId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to block user");
    }
    return response.json();
  } catch (error) {
    console.error("Error blocking user:", error);
    return null;
  }
};

export const unblockUser = async (blockedUserId) => {
  try {
    const response = await fetch(`/api/friend/unblock/${blockedUserId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to unblock user");
    }
    return response.json();
  } catch (error) {
    console.error("Error unblocking user:", error);
    return null;
  }
};

export const getFriendById = async (friendId) => {
  try {
    const response = await fetch(`/api/friend/${friendId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch friend details");
    }
    return response.json();
  } catch (error) {
    console.error("Error fetching friend details:", error);
    return null;
  }
};

export const resetPassword = async (email) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/users/reset-password`, {
      email,
    });
    return response.data;
  } catch (error) {
    console.error("Error resetting password:", error);
    throw error;
  }
};

// API để gửi email xác thực
export const sendVerificationEmail = async (email) => {
  try {
    const payload = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    };

    let response = await fetchWithTimeout(
      `${AUTH_BASE_URL}/auth/verify-email`,
      payload,
      20000,
    );

    if (
      !response.ok &&
      response.status === 403 &&
      AUTH_BASE_URL !== DEFAULT_BACKEND_URL
    ) {
      response = await fetchWithTimeout(
        `${DEFAULT_BACKEND_URL}/auth/verify-email`,
        payload,
        20000,
      );
    }

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Error from server:", errorData);
      throw new Error("Không thể gửi email xác thực");
    }

    return true;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Kết nối quá lâu. Vui lòng thử lại sau ít phút.");
    }
    console.error("Lỗi khi gửi email xác thực:", error);
    throw error;
  }
};

// API để xác thực email bằng mã code
export const verifyEmailWithCode = async (email, code, userRegisterRequest) => {
  try {
    console.log("Gửi yêu cầu xác thực email:", {
      email,
      code,
      userRegisterRequest,
    });

    const response = await fetchWithTimeout(
      `${AUTH_BASE_URL}/auth/verify-email-code`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          code: code,
          userRegisterRequest: userRegisterRequest,
        }),
      },
      20000,
    );

    if (!response.ok) {
      let errorMessage = "Xác thực email thất bại";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Nếu phản hồi không phải JSON, sử dụng thông báo mặc định
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Kết nối quá lâu. Vui lòng thử lại sau ít phút.");
    }
    console.error("Lỗi khi xác thực email:", error);
    throw error;
  }
};

export const fetchUserByPhone = async (phone) => {
  try {
    const token = localStorage.getItem("accessToken");
    console.log(
      "🔑 Token for user search:",
      token ? token.substring(0, 50) + "..." : "NO TOKEN",
    );
    console.log("🔍 Searching user by phone:", phone);

    const response = await fetch(
      `${API_BASE_URL}/user/get-user-by-phone/${phone}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    console.log("📡 User search response status:", response.status);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Không tìm thấy người dùng với số điện thoại này");
      }

      // Try to parse error message from response
      const responseClone = response.clone();
      try {
        const errorData = await response.json();
        console.error("❌ User search error:", errorData);
        throw new Error(errorData.message || "Không thể tìm người dùng");
      } catch (jsonError) {
        const text = await responseClone.text();
        console.error("❌ User search error (text):", text);
        throw new Error("Không thể tìm người dùng với số điện thoại này");
      }
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user by phone:", error);
    throw error;
  }
};

export const fetchUserById = async (userId) => {
  try {
    const token = localStorage.getItem("accessToken");

    const response = await fetch(
      `${API_BASE_URL}/user/get-user-by-id/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Không tìm thấy người dùng");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || "Không thể lấy thông tin người dùng",
      );
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching user by id:", error);
    throw error;
  }
};
