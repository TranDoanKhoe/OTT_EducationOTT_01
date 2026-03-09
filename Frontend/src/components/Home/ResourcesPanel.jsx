import React, { useState, useRef, useEffect } from "react";
import {
  BiBookOpen,
  BiImage,
  BiVideo,
  BiMusic,
  BiFolder,
  BiSearch,
  BiUpload,
  BiDownload,
  BiShare,
  BiTrash,
  BiGridAlt,
  BiListUl,
  BiDotsVerticalRounded,
  BiX,
  BiCheck,
  BiLoaderAlt,
  BiFileBlank,
  BiFile,
  BiChevronRight,
  BiArrowBack,
  BiHome,
  BiShow,
} from "react-icons/bi";
import { FaFilePdf, FaFileWord } from "react-icons/fa";
import { HiAcademicCap, HiDocumentText } from "react-icons/hi";
import {
  getResources,
  uploadResource,
  createFolder,
  deleteResource,
  downloadResource,
  shareResource,
  getStorageInfo,
  formatFileSize,
  getFileCategory,
} from "../../api/resourceApi";
import { sendMessage as sendChatMessage } from "../../api/messageApi";
import { fetchFriendsList } from "../../api/user";
import { fetchUserGroups } from "../../api/groupApi";

// UI container for browsing, uploading, sharing, and previewing user resources.
const ResourcesPanel = () => {
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showContextMenu, setShowContextMenu] = useState(null);
  const [storageInfo, setStorageInfo] = useState({
    used: 0,
    total: 5 * 1024 * 1024 * 1024,
  }); // 5GB default
  const [notification, setNotification] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderPath, setFolderPath] = useState([]); // Breadcrumb path
  const [previewResource, setPreviewResource] = useState(null); // Preview modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingResource, setSharingResource] = useState(null);
  const [shareTargetType, setShareTargetType] = useState("user");
  const [shareTargetId, setShareTargetId] = useState("");
  const [shareSearchQuery, setShareSearchQuery] = useState("");
  const [shareCandidates, setShareCandidates] = useState({
    user: [],
    group: [],
  });
  const [loadingShareCandidates, setLoadingShareCandidates] = useState(false);
  const [submittingShare, setSubmittingShare] = useState(false);

  const fileInputRef = useRef(null);
  const token = localStorage.getItem("accessToken");
  const currentUserId = localStorage.getItem("userId");

  const isFolderResource = (resource) => {
    return resource?.isFolder === true || resource?.folder === true;
  };

  // Tính toán số lượng theo category
  const getCategoryCounts = () => {
    const counts = {
      all: 0,
      documents: 0,
      images: 0,
      videos: 0,
      audio: 0,
    };

    resources.forEach((res) => {
      if (isFolderResource(res)) {
        return;
      }
      counts.all++;
      const category = getFileCategory(res.name || res.fileName);
      if (counts[category] !== undefined) {
        counts[category]++;
      }
    });

    return counts;
  };

  const categoryCounts = getCategoryCounts();

  const categories = [
    {
      id: "all",
      name: "Tất cả",
      icon: BiFolder,
      count: categoryCounts.all,
    },
    {
      id: "documents",
      name: "Tài liệu",
      icon: HiDocumentText,
      count: categoryCounts.documents,
    },
    {
      id: "images",
      name: "Hình ảnh",
      icon: BiImage,
      count: categoryCounts.images,
    },
    {
      id: "videos",
      name: "Video",
      icon: BiVideo,
      count: categoryCounts.videos,
    },
    {
      id: "audio",
      name: "Âm thanh",
      icon: BiMusic,
      count: categoryCounts.audio,
    },
  ];

  // Show notification
  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fetch resources on mount and when folder changes
  useEffect(() => {
    fetchResources();
    fetchStorageInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId]);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const data = await getResources(token, "all");
      const list = Array.isArray(data) ? data : [];
      const scopedList = list.filter(
        (resource) => resource?.userId === currentUserId,
      );
      setResources(scopedList);
    } catch (error) {
      console.error("Error fetching resources:", error);
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStorageInfo = async () => {
    try {
      const info = await getStorageInfo(token);
      if (info) setStorageInfo(info);
    } catch (error) {
      console.error("Error fetching storage info:", error);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(Math.round(((i + 1) / files.length) * 100));

        const result = await uploadResource(file, token, currentFolderId);
        if (result) {
          setResources((prev) => [...prev, result]);
        }
      }
      showNotification(`Đã tải lên ${files.length} tệp thành công!`);
      fetchStorageInfo();
    } catch {
      showNotification("Lỗi khi tải lên tệp", "error");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      const result = await createFolder(newFolderName, currentFolderId, token);
      if (result) {
        setResources((prev) => [...prev, { ...result, isFolder: true }]);
        showNotification(`Đã tạo thư mục "${newFolderName}"`);
      }
    } catch {
      showNotification("Lỗi khi tạo thư mục", "error");
    } finally {
      setShowCreateFolder(false);
      setNewFolderName("");
    }
  };

  // Handle open folder
  const handleOpenFolder = (folder) => {
    setCurrentFolderId(folder.id);
    setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }]);
    // Resources will be fetched automatically by useEffect when currentFolderId changes
  };

  // Handle go back to parent folder
  const handleGoBack = () => {
    if (folderPath.length > 0) {
      const newPath = [...folderPath];
      newPath.pop();
      setFolderPath(newPath);
      setCurrentFolderId(
        newPath.length > 0 ? newPath[newPath.length - 1].id : null,
      );
      // Resources will be fetched automatically by useEffect when currentFolderId changes
    }
  };

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = (index) => {
    if (index === -1) {
      // Root
      setCurrentFolderId(null);
      setFolderPath([]);
    } else {
      const newPath = folderPath.slice(0, index + 1);
      setFolderPath(newPath);
      setCurrentFolderId(newPath[index].id);
    }
  };

  // Handle delete resource
  const handleDelete = async (resource) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn xóa "${resource.name || resource.fileName}"?`,
      )
    )
      return;

    try {
      await deleteResource(resource.id, token);
      setResources((prev) => prev.filter((r) => r.id !== resource.id));
      showNotification("Đã xóa thành công");
      fetchStorageInfo();
    } catch {
      showNotification("Lỗi khi xóa tệp", "error");
    }
    setShowContextMenu(null);
  };

  // Handle download
  const handleDownload = async (resource) => {
    try {
      const blob = await downloadResource(resource.id, token);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resource.name || resource.fileName || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification("Đang tải xuống...");
    } catch {
      showNotification("Lỗi khi tải xuống", "error");
    }
    setShowContextMenu(null);
  };

  const handleShare = async (resource) => {
    setSharingResource(resource);
    setShowShareModal(true);
    setShareTargetId("");
    setShareSearchQuery("");
    setShareTargetType("user");
    setShowContextMenu(null);

    if (shareCandidates.user.length > 0 || shareCandidates.group.length > 0) {
      return;
    }

    setLoadingShareCandidates(true);
    try {
      const [friendsResponse, groupsResponse] = await Promise.all([
        fetchFriendsList(),
        fetchUserGroups(currentUserId, token),
      ]);

      setShareCandidates({
        user: Array.isArray(friendsResponse) ? friendsResponse : [],
        group: Array.isArray(groupsResponse) ? groupsResponse : [],
      });
    } catch {
      showNotification("Không thể tải danh sách để chia sẻ", "error");
      setShareCandidates({ user: [], group: [] });
    } finally {
      setLoadingShareCandidates(false);
    }
  };

  const getShareCandidateName = (candidate, type) => {
    if (type === "group") {
      return candidate.name || "Nhóm không tên";
    }

    const nestedFullName =
      `${candidate.user?.firstName || ""} ${candidate.user?.lastName || ""}`.trim();
    const fullName =
      `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim();

    return (
      candidate.name ||
      fullName ||
      nestedFullName ||
      candidate.fullName ||
      candidate.displayName ||
      candidate.username ||
      candidate.email ||
      candidate.phone ||
      "Người dùng"
    );
  };

  const getShareCandidateMeta = (candidate, type) => {
    if (type === "group") {
      return candidate.classCode || candidate.groupType || "Nhóm học tập";
    }

    const meta =
      candidate.phone ||
      candidate.user?.phone ||
      candidate.email ||
      candidate.username ||
      "";

    const displayName = getShareCandidateName(candidate, type);
    if (!meta || meta === displayName) {
      return "Bạn bè";
    }
    return meta;
  };

  const currentShareCandidates =
    shareCandidates[shareTargetType]?.filter((candidate) =>
      getShareCandidateName(candidate, shareTargetType)
        .toLowerCase()
        .includes(shareSearchQuery.toLowerCase()),
    ) || [];

  const handleConfirmShare = async () => {
    if (!sharingResource || !shareTargetId) {
      showNotification("Vui lòng chọn đối tượng chia sẻ", "error");
      return;
    }

    setSubmittingShare(true);
    try {
      await shareResource(
        sharingResource.id,
        shareTargetId,
        shareTargetType,
        token,
      );

      const isFolder =
        sharingResource.isFolder === true || sharingResource.folder === true;
      const sharedName =
        sharingResource.name || sharingResource.fileName || "Tài liệu";

      const messagePayload = {
        senderId: currentUserId,
        [shareTargetType === "group" ? "groupId" : "receiverId"]: shareTargetId,
        type: isFolder ? "TEXT" : "FILE",
        content: isFolder
          ? `Da chia se thu muc: ${sharedName}`
          : sharingResource.fileUrl,
        fileName: isFolder ? undefined : sharedName,
      };

      const sent = sendChatMessage("/app/chat.send", messagePayload, token);

      if (!sent) {
        showNotification(
          "Da chia se nhung chua gui duoc tin nhan (kiem tra ket noi)",
          "error",
        );
      } else {
        showNotification("Chia se tai lieu va gui tin nhan thanh cong");
      }
      setShowShareModal(false);
      setSharingResource(null);
      setShareTargetId("");
    } catch {
      showNotification("Chia sẻ tài liệu thất bại", "error");
    } finally {
      setSubmittingShare(false);
    }
  };

  // Count items in a folder
  const getItemCount = (folderId) => {
    return resources.filter((r) => (r.parentId || null) === folderId).length;
  };

  // Helper to check if resource is a folder (handle both isFolder and folder)
  const checkIsFolder = (resource) => {
    return isFolderResource(resource);
  };

  // Check if file can be previewed
  const canPreview = (resource) => {
    if (checkIsFolder(resource)) return false;
    const fileName = resource.name || resource.fileName || "";
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const previewableExts = [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "bmp",
      "mp4",
      "webm",
      "ogg",
      "mov",
      "mp3",
      "wav",
      "flac",
      "aac",
      "pdf",
      "txt",
      "json",
      "xml",
      "html",
      "css",
      "js",
      "md",
    ];
    return previewableExts.includes(ext);
  };

  // Get preview type
  const getPreviewType = (resource) => {
    const fileName = resource.name || resource.fileName || "";
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext))
      return "image";
    if (["mp4", "webm", "ogg", "mov"].includes(ext)) return "video";
    if (["mp3", "wav", "flac", "aac"].includes(ext)) return "audio";
    if (ext === "pdf") return "pdf";
    if (["txt", "json", "xml", "html", "css", "js", "md"].includes(ext))
      return "text";
    return null;
  };

  // Handle preview
  const handlePreview = (resource, e) => {
    if (e) e.stopPropagation();
    setShowContextMenu(null);
    if (canPreview(resource)) {
      setPreviewResource(resource);
    }
  };

  // Filter resources
  const filteredResources = resources.filter((res) => {
    const name = res.name || res.fileName || "";
    const matchesSearch = name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const category = getFileCategory(name);
    const matchesCategory =
      selectedCategory === "all" ||
      category === selectedCategory ||
      checkIsFolder(res);
    // Filter by current folder - handle null, undefined, empty string
    const resParentId = res.parentId || null;
    const currentFolder = currentFolderId || null;
    const matchesFolder = resParentId === currentFolder;
    return matchesSearch && matchesCategory && matchesFolder;
  });

  // Get file icon based on type
  const getFileIcon = (fileName) => {
    const ext = fileName?.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
      return <BiImage className="w-8 h-8 text-violet-500" />;
    }
    if (["mp4", "avi", "mov", "wmv", "mkv"].includes(ext)) {
      return <BiVideo className="w-8 h-8 text-amber-500" />;
    }
    if (["mp3", "wav", "flac", "ogg"].includes(ext)) {
      return <BiMusic className="w-8 h-8 text-pink-500" />;
    }
    if (["pdf"].includes(ext)) {
      return <FaFilePdf className="w-8 h-8 text-red-500" />;
    }
    if (["doc", "docx"].includes(ext)) {
      return <FaFileWord className="w-8 h-8 text-blue-500" />;
    }
    return <BiFileBlank className="w-8 h-8 text-gray-500" />;
  };

  // Storage percentage
  const storagePercentage = (storageInfo.used / storageInfo.total) * 100;
  const totalFileCount = resources.filter((r) => !isFolderResource(r)).length;

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        multiple
        className="hidden"
        accept="*/*"
      />

      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in ${
            notification.type === "error"
              ? "bg-red-500 text-white"
              : "bg-emerald-500 text-white"
          }`}
        >
          {notification.type === "error" ? (
            <BiX className="w-5 h-5" />
          ) : (
            <BiCheck className="w-5 h-5" />
          )}
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <BiBookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Tài liệu học tập
              </h1>
              <p className="text-sm text-gray-500">
                {storageInfo.fileCount ?? totalFileCount} tệp ·{" "}
                {formatFileSize(storageInfo.used)} đã sử dụng
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-gray-700 rounded-xl transition-colors border border-gray-200"
            >
              <BiFolder className="w-5 h-5" />
              <span className="font-medium">Thư mục mới</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors shadow-lg shadow-emerald-200 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <BiLoaderAlt className="w-5 h-5 animate-spin" />
                  <span className="font-medium">{uploadProgress}%</span>
                </>
              ) : (
                <>
                  <BiUpload className="w-5 h-5" />
                  <span className="font-medium">Tải lên</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search and View Toggle */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tài liệu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none text-sm"
            />
          </div>
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "grid"
                  ? "bg-white shadow-sm text-emerald-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BiGridAlt className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-white shadow-sm text-emerald-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BiListUl className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Breadcrumb Navigation */}
        {folderPath.length > 0 && (
          <div className="flex items-center gap-2 mt-4 py-2 px-3 bg-gray-50 rounded-xl">
            <button
              onClick={handleGoBack}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
              title="Quay lại"
            >
              <BiArrowBack className="w-4 h-4 text-gray-600" />
            </button>
            <div className="flex items-center gap-1 text-sm overflow-x-auto">
              <button
                onClick={() => handleBreadcrumbClick(-1)}
                className="flex items-center gap-1 px-2 py-1 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
              >
                <BiHome className="w-4 h-4" />
                <span>Tài liệu</span>
              </button>
              {folderPath.map((folder, index) => (
                <React.Fragment key={folder.id}>
                  <BiChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <button
                    onClick={() => handleBreadcrumbClick(index)}
                    className={`px-2 py-1 rounded-lg transition-colors truncate max-w-[150px] ${
                      index === folderPath.length - 1
                        ? "bg-emerald-100 text-emerald-700 font-medium"
                        : "hover:bg-gray-200 text-gray-600"
                    }`}
                  >
                    {folder.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Categories */}
        <div className="w-56 bg-white border-r border-gray-100 p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Danh mục
          </h3>
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  selectedCategory === cat.id
                    ? "bg-emerald-50 text-emerald-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <cat.icon className="w-5 h-5" />
                <span className="text-sm font-medium flex-1 text-left">
                  {cat.name}
                </span>
                <span className="text-xs text-gray-400">{cat.count}</span>
              </button>
            ))}
          </div>

          {/* Storage Info */}
          <div className="mt-6 p-4 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Dung lượng
              </span>
              <span className="text-xs text-gray-500">
                {formatFileSize(storageInfo.used)} /{" "}
                {formatFileSize(storageInfo.total)}
              </span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  storagePercentage > 90
                    ? "bg-red-500"
                    : storagePercentage > 70
                      ? "bg-amber-500"
                      : "bg-gradient-to-r from-emerald-400 to-emerald-500"
                }`}
                style={{
                  width: `${Math.min(storagePercentage, 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Create Folder Modal */}
          {showCreateFolder && (
            <div className="mt-4 p-3 bg-white rounded-xl border border-gray-200">
              <input
                type="text"
                placeholder="Tên thư mục..."
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none mb-2"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCreateFolder(false);
                    setNewFolderName("");
                  }}
                  className="flex-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="flex-1 px-3 py-1.5 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                >
                  Tạo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            /* Loading State */
            <div className="flex flex-col items-center justify-center h-full">
              <BiLoaderAlt className="w-12 h-12 text-emerald-500 animate-spin mb-4" />
              <p className="text-gray-500">Đang tải tài liệu...</p>
            </div>
          ) : filteredResources.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-full">
              <div className="relative mb-6">
                <div className="w-32 h-32 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-full flex items-center justify-center">
                  <BiBookOpen className="w-16 h-16 text-emerald-500" />
                </div>
                {/* Decorative elements */}
                <div
                  className="absolute top-0 right-1/4 w-4 h-4 bg-amber-300 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="absolute bottom-4 left-1/4 w-3 h-3 bg-violet-300 rounded-full animate-bounce"
                  style={{ animationDelay: "0.3s" }}
                ></div>
                <div
                  className="absolute top-1/2 right-0 w-2 h-2 bg-emerald-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.5s" }}
                ></div>
              </div>

              <h2 className="text-2xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                Kho tài liệu học tập
                <HiAcademicCap className="w-7 h-7 text-amber-500" />
              </h2>
              <p className="text-gray-500 text-center max-w-md mb-6">
                Lưu trữ, quản lý và chia sẻ tài liệu học tập với bạn bè và nhóm
                học của bạn.
              </p>

              {/* Features */}
              <div className="mt-4 grid grid-cols-3 gap-6 max-w-lg">
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-2">
                    <BiUpload className="w-6 h-6 text-emerald-600" />
                  </div>
                  <span className="text-sm text-gray-600">Tải lên dễ dàng</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center mb-2">
                    <BiShare className="w-6 h-6 text-violet-600" />
                  </div>
                  <span className="text-sm text-gray-600">Chia sẻ nhanh</span>
                </div>
                <div className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-2">
                    <BiDownload className="w-6 h-6 text-amber-600" />
                  </div>
                  <span className="text-sm text-gray-600">
                    Tải xuống mọi lúc
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* Resources Grid/List */
            <div
              className={
                viewMode === "grid"
                  ? "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
                  : "space-y-2"
              }
            >
              {filteredResources.map((resource) =>
                viewMode === "grid" ? (
                  /* Grid View Card */
                  <div
                    key={resource.id}
                    className="group relative bg-white rounded-xl border border-gray-100 p-4 hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer"
                    onClick={() =>
                      checkIsFolder(resource)
                        ? handleOpenFolder(resource)
                        : handlePreview(resource)
                    }
                    onDoubleClick={() =>
                      checkIsFolder(resource) && handleOpenFolder(resource)
                    }
                  >
                    {/* File Icon */}
                    <div className="w-full aspect-square bg-gray-50 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-50 transition-colors">
                      {checkIsFolder(resource) ? (
                        <BiFolder className="w-12 h-12 text-amber-500" />
                      ) : resource.thumbnail ? (
                        <img
                          src={resource.thumbnail}
                          alt={resource.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        getFileIcon(resource.name || resource.fileName)
                      )}
                    </div>

                    {/* File Info */}
                    <h4 className="font-medium text-gray-800 truncate text-sm">
                      {resource.name || resource.fileName}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      {checkIsFolder(resource)
                        ? `${getItemCount(resource.id)} mục`
                        : formatFileSize(resource.size || 0)}
                    </p>

                    {/* Context Menu Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowContextMenu(
                          showContextMenu === resource.id ? null : resource.id,
                        );
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/80 opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-all"
                    >
                      <BiDotsVerticalRounded className="w-4 h-4 text-gray-500" />
                    </button>

                    {/* Context Menu */}
                    {showContextMenu === resource.id && (
                      <div className="absolute top-10 right-2 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-10 min-w-[140px]">
                        {canPreview(resource) && (
                          <button
                            onClick={(e) => handlePreview(resource, e)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50"
                          >
                            <BiShow className="w-4 h-4" />
                            Xem trước
                          </button>
                        )}
                        {!checkIsFolder(resource) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownload(resource);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <BiDownload className="w-4 h-4" />
                            Tải xuống
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(resource);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <BiShare className="w-4 h-4" />
                          Chia sẻ
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(resource);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <BiTrash className="w-4 h-4" />
                          Xóa
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* List View Row */
                  <div
                    key={resource.id}
                    className="group flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-3 hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer"
                    onClick={() =>
                      checkIsFolder(resource)
                        ? handleOpenFolder(resource)
                        : handlePreview(resource)
                    }
                  >
                    {/* File Icon */}
                    <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-50 transition-colors">
                      {checkIsFolder(resource) ? (
                        <BiFolder className="w-6 h-6 text-amber-500" />
                      ) : (
                        getFileIcon(resource.name || resource.fileName)
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-800 truncate">
                        {resource.name || resource.fileName}
                      </h4>
                      <p className="text-xs text-gray-400">
                        {checkIsFolder(resource)
                          ? `${getItemCount(resource.id)} mục`
                          : formatFileSize(resource.size || 0)}
                        {resource.createdAt &&
                          ` · ${new Date(resource.createdAt).toLocaleDateString("vi-VN")}`}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canPreview(resource) && (
                        <button
                          onClick={(e) => handlePreview(resource, e)}
                          className="p-2 rounded-lg hover:bg-emerald-50 text-gray-500 hover:text-emerald-600"
                          title="Xem trước"
                        >
                          <BiShow className="w-5 h-5" />
                        </button>
                      )}
                      {!checkIsFolder(resource) && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(resource);
                          }}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-blue-600"
                          title="Tải xuống"
                        >
                          <BiDownload className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShare(resource);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-violet-600"
                        title="Chia sẻ"
                      >
                        <BiShare className="w-5 h-5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(resource);
                        }}
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600"
                        title="Xóa"
                      >
                        <BiTrash className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ),
              )}
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close context menu */}
      {showContextMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowContextMenu(null)}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowShareModal(false)}
        >
          <div
            className="w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  Chia sẻ tài liệu
                </h3>
                <p className="text-sm text-gray-500 truncate max-w-[220px] sm:max-w-[400px]">
                  {sharingResource?.name || sharingResource?.fileName || "Tệp"}
                </p>
              </div>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <BiX className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setShareTargetType("user");
                    setShareTargetId("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    shareTargetType === "user"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Bạn bè
                </button>
                <button
                  onClick={() => {
                    setShareTargetType("group");
                    setShareTargetId("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    shareTargetType === "group"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  Nhóm học
                </button>
              </div>

              <div className="relative">
                <BiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={shareSearchQuery}
                  onChange={(e) => setShareSearchQuery(e.target.value)}
                  placeholder={
                    shareTargetType === "user"
                      ? "Tìm bạn bè..."
                      : "Tìm nhóm học..."
                  }
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm"
                />
              </div>

              <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-xl">
                {loadingShareCandidates ? (
                  <div className="p-6 flex items-center justify-center text-sm text-gray-500 gap-2">
                    <BiLoaderAlt className="w-4 h-4 animate-spin" />
                    Đang tải danh sách...
                  </div>
                ) : currentShareCandidates.length === 0 ? (
                  <div className="p-6 text-sm text-gray-500 text-center">
                    Không có dữ liệu để chia sẻ
                  </div>
                ) : (
                  currentShareCandidates.map((candidate) => {
                    const candidateId = candidate.id;
                    const candidateName = getShareCandidateName(
                      candidate,
                      shareTargetType,
                    );

                    return (
                      <button
                        key={`${shareTargetType}-${candidateId}`}
                        onClick={() => setShareTargetId(candidateId)}
                        className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                          shareTargetId === candidateId
                            ? "bg-emerald-50"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <p className="font-medium text-gray-800 truncate">
                          {candidateName}
                        </p>
                        {shareTargetType === "user" && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {getShareCandidateMeta(candidate, shareTargetType)}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmShare}
                disabled={!shareTargetId || submittingShare}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm flex items-center gap-2"
              >
                {submittingShare && (
                  <BiLoaderAlt className="w-4 h-4 animate-spin" />
                )}
                Chia sẻ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewResource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setPreviewResource(null)}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-5xl max-h-[90vh] w-full mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <BiShow className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800 truncate max-w-md">
                    {previewResource.name || previewResource.fileName}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(previewResource.size || 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleDownload(previewResource);
                    setPreviewResource(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                >
                  <BiDownload className="w-4 h-4" />
                  Tải xuống
                </button>
                <button
                  onClick={() => setPreviewResource(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <BiX className="w-6 h-6 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 overflow-auto max-h-[calc(90vh-80px)] bg-gray-100 flex items-center justify-center min-h-[260px] sm:min-h-[400px]">
              {getPreviewType(previewResource) === "image" && (
                <img
                  src={previewResource.fileUrl}
                  alt={previewResource.name || previewResource.fileName}
                  className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                />
              )}

              {getPreviewType(previewResource) === "video" && (
                <video
                  src={previewResource.fileUrl}
                  controls
                  className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                >
                  Trình duyệt không hỗ trợ video này.
                </video>
              )}

              {getPreviewType(previewResource) === "audio" && (
                <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-2xl shadow-lg">
                  <div className="w-32 h-32 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center">
                    <BiMusic className="w-16 h-16 text-white" />
                  </div>
                  <h4 className="font-medium text-gray-800 text-center">
                    {previewResource.name || previewResource.fileName}
                  </h4>
                  <audio
                    src={previewResource.fileUrl}
                    controls
                    className="w-full max-w-md"
                  >
                    Trình duyệt không hỗ trợ audio này.
                  </audio>
                </div>
              )}

              {getPreviewType(previewResource) === "pdf" && (
                <iframe
                  src={previewResource.fileUrl}
                  title={previewResource.name || previewResource.fileName}
                  className="w-full h-[70vh] rounded-lg border-0"
                />
              )}

              {getPreviewType(previewResource) === "text" && (
                <iframe
                  src={previewResource.fileUrl}
                  title={previewResource.name || previewResource.fileName}
                  className="w-full h-[70vh] rounded-lg bg-white border border-gray-200"
                />
              )}

              {!getPreviewType(previewResource) && (
                <div className="flex flex-col items-center gap-4 text-gray-500">
                  <BiFileBlank className="w-16 h-16" />
                  <p>Không thể xem trước loại tệp này</p>
                  <button
                    onClick={() => {
                      handleDownload(previewResource);
                      setPreviewResource(null);
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
                  >
                    Tải xuống để xem
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesPanel;
