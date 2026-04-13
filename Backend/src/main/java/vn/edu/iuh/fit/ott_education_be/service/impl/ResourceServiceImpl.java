package vn.edu.iuh.fit.ott_education_be.service.impl;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.ott_education_be.model.Group;
import vn.edu.iuh.fit.ott_education_be.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.ott_education_be.model.Resource;
import vn.edu.iuh.fit.ott_education_be.repository.GroupRepository;
import vn.edu.iuh.fit.ott_education_be.repository.ResourceRepository;
import vn.edu.iuh.fit.ott_education_be.service.ResourceService;

import java.io.IOException;
import java.io.InputStream;
import java.net.URL;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j(topic = "RESOURCE-SERVICE")
public class ResourceServiceImpl implements ResourceService {
    
    private final ResourceRepository resourceRepository;
    private final GroupRepository groupRepository;
    private final Cloudinary cloudinary;
    
    // 5GB storage limit per user
    private static final long MAX_STORAGE_PER_USER = 5L * 1024 * 1024 * 1024;
    
    @Override
    public List<Resource> getResourcesByUserId(String userId) {
        return resourceRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }
    
    @Override
    public List<Resource> getResourcesByUserIdAndCategory(String userId, String category) {
        List<Resource> accessibleResources = getAccessibleResources(userId);

        if (category == null || category.equals("all")) {
            return accessibleResources;
        }

        return accessibleResources.stream()
                .filter(resource -> resource.isFolder() || category.equals(resource.getCategory()))
                .sorted(Comparator.comparing(Resource::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }
    
    @Override
    public Resource getResourceById(String resourceId) {
        return resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu"));
    }
    
    @Override
    public Resource uploadResource(MultipartFile file, String userId, String folderId) {
        if (file == null || file.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy file");
        }
        
        // Check storage limit
        Map<String, Object> storageInfo = getStorageInfo(userId);
        long usedStorage = (Long) storageInfo.get("used");
        if (usedStorage + file.getSize() > MAX_STORAGE_PER_USER) {
            throw new ResourceNotFoundException("Đã vượt quá giới hạn dung lượng lưu trữ (5GB)");
        }
        
        try {
            String originalFileName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "unnamed_file";
            String contentType = file.getContentType();
            String resourceType;
            String category;
            
            log.info("Processing file: {} with content type: {}, size: {} bytes", originalFileName, contentType, file.getSize());
            
            // Determine resource type and category
            if (contentType != null) {
                if (contentType.startsWith("image/")) {
                    resourceType = "image";
                    category = "images";
                } else if (contentType.startsWith("video/")) {
                    resourceType = "video";
                    category = "videos";
                } else if (contentType.startsWith("audio/")) {
                    resourceType = "audio";
                    category = "audio";
                } else {
                    resourceType = "raw";
                    category = "documents";
                }
            } else {
                resourceType = "raw";
                category = "documents";
            }
            
            // Get file extension
            String fileExtension = "";
            String baseName = originalFileName;
            int lastDotIdx = originalFileName.lastIndexOf('.');
            if (lastDotIdx > 0) {
                fileExtension = originalFileName.substring(lastDotIdx).toLowerCase();
                baseName = originalFileName.substring(0, lastDotIdx);
            }
            
            String sanitizedFileName = baseName.replaceAll("[^a-zA-Z0-9-]", "_");
            
            // Upload to Cloudinary
            Map uploadParams = ObjectUtils.asMap(
                "resource_type", resourceType.equals("audio") ? "video" : resourceType,
                "folder", "resources/" + userId,
                "use_filename", true,
                "unique_filename", true,
                "format", fileExtension.isEmpty() ? null : fileExtension.substring(1)
            );
            
            Map uploadResult = cloudinary.uploader().upload(file.getBytes(), uploadParams);
            String url = (String) uploadResult.get("secure_url");
            String cloudinaryPublicId = (String) uploadResult.get("public_id");
            String thumbnail = null;
            
            // Get thumbnail for videos and images
            if (category.equals("videos") || category.equals("images")) {
                thumbnail = url.replace("/upload/", "/upload/w_200,h_200,c_fill/");
            }
            
            log.info("File uploaded to Cloudinary. URL: {}, PublicId: {}", url, cloudinaryPublicId);
            
            // Save resource to database
            Resource resource = Resource.builder()
                    .userId(userId)
                    .name(originalFileName)
                    .fileName(originalFileName)
                    .fileUrl(url)
                    .publicId(cloudinaryPublicId)
                    .mimeType(contentType)
                    .size(file.getSize())
                    .category(category)
                    .thumbnail(thumbnail)
                    .isFolder(false)
                    .parentId(folderId)
                    .sharedWith(new ArrayList<>())
                    .sharedGroups(new ArrayList<>())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            
            return resourceRepository.save(resource);
            
        } catch (IOException e) {
            log.error("Error uploading file: {}", e.getMessage());
            throw new RuntimeException("Lỗi khi tải lên file: " + e.getMessage());
        }
    }
    
    @Override
    public Resource createFolder(String name, String parentId, String userId) {
        if (name == null || name.trim().isEmpty()) {
            throw new ResourceNotFoundException("Tên thư mục không được để trống");
        }
        
        Resource folder = Resource.builder()
                .userId(userId)
                .name(name.trim())
                .fileName(name.trim())
                .isFolder(true)
                .parentId(parentId)
                .sharedWith(new ArrayList<>())
                .sharedGroups(new ArrayList<>())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
        
        return resourceRepository.save(folder);
    }
    
    @Override
    public void deleteResource(String resourceId, String userId) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu"));
        
        if (!resource.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Bạn không có quyền xóa tài liệu này");
        }

        deleteResourceRecursive(resource, userId);
        log.info("Deleted resource: {}", resourceId);
    }
    
    @Override
    public Resource shareResource(String resourceId, String targetId, String targetType, String userId) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu"));
        
        if (!resource.getUserId().equals(userId)) {
            throw new ResourceNotFoundException("Bạn không có quyền chia sẻ tài liệu này");
        }
        
        if ("user".equals(targetType)) {
            if (resource.getSharedWith() == null) {
                resource.setSharedWith(new ArrayList<>());
            }
            if (!resource.getSharedWith().contains(targetId)) {
                resource.getSharedWith().add(targetId);
            }
        } else if ("group".equals(targetType)) {
            if (resource.getSharedGroups() == null) {
                resource.setSharedGroups(new ArrayList<>());
            }
            if (!resource.getSharedGroups().contains(targetId)) {
                resource.getSharedGroups().add(targetId);
            }
        }
        
        resource.setUpdatedAt(LocalDateTime.now());
        return resourceRepository.save(resource);
    }
    
    @Override
    public Map<String, Object> getStorageInfo(String userId) {
        List<Resource> resources = resourceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        
        long usedStorage = resources.stream()
                .filter(r -> !r.isFolder() && r.getSize() != null)
                .mapToLong(Resource::getSize)
                .sum();

        long fileCount = resources.stream()
            .filter(r -> !r.isFolder())
            .count();
        
        Map<String, Object> info = new HashMap<>();
        info.put("used", usedStorage);
        info.put("total", MAX_STORAGE_PER_USER);
        info.put("fileCount", fileCount);
        
        return info;
    }
    
    @Override
    public byte[] downloadResource(String resourceId, String userId) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài liệu"));
        
        Set<String> userGroupIds = groupRepository.findByMemberIdsContaining(userId)
            .stream()
            .map(Group::getId)
            .collect(java.util.stream.Collectors.toSet());

        // Check if user has access
        boolean hasAccess = resource.getUserId().equals(userId) ||
            (resource.getSharedWith() != null && resource.getSharedWith().contains(userId)) ||
            (resource.getSharedGroups() != null && resource.getSharedGroups().stream().anyMatch(userGroupIds::contains));
        
        if (!hasAccess) {
            throw new ResourceNotFoundException("Bạn không có quyền tải xuống tài liệu này");
        }
        
        if (resource.isFolder()) {
            throw new ResourceNotFoundException("Không thể tải xuống thư mục");
        }
        
        try {
            URL url = new URL(resource.getFileUrl());
            try (InputStream in = url.openStream()) {
                return in.readAllBytes();
            }
        } catch (IOException e) {
            log.error("Error downloading file: {}", e.getMessage());
            throw new RuntimeException("Lỗi khi tải xuống file: " + e.getMessage());
        }
    }

    private List<Resource> getAccessibleResources(String userId) {
        List<Resource> ownedResources = resourceRepository.findByUserIdOrderByCreatedAtDesc(userId);
        List<Resource> sharedByUser = resourceRepository.findBySharedWithContainingOrderByCreatedAtDesc(userId);

        Set<String> userGroupIds = groupRepository.findByMemberIdsContaining(userId)
                .stream()
                .map(Group::getId)
                .collect(java.util.stream.Collectors.toSet());

        List<Resource> sharedByGroup = new ArrayList<>();
        for (String groupId : userGroupIds) {
            sharedByGroup.addAll(resourceRepository.findBySharedGroupsContainingOrderByCreatedAtDesc(groupId));
        }

        Map<String, Resource> dedupedById = new HashMap<>();
        for (Resource resource : ownedResources) {
            dedupedById.put(resource.getId(), resource);
        }
        for (Resource resource : sharedByUser) {
            dedupedById.putIfAbsent(resource.getId(), resource);
        }
        for (Resource resource : sharedByGroup) {
            dedupedById.putIfAbsent(resource.getId(), resource);
        }

        return dedupedById.values().stream()
                .sorted(Comparator.comparing(Resource::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    private void deleteResourceRecursive(Resource resource, String userId) {
        if (resource.isFolder()) {
            List<Resource> children = resourceRepository.findByUserIdAndParentIdOrderByCreatedAtDesc(userId, resource.getId());
            for (Resource child : children) {
                deleteResourceRecursive(child, userId);
            }
            resourceRepository.delete(resource);
            return;
        }

        if (resource.getPublicId() != null) {
            try {
                String resourceType = "image";
                if (resource.getCategory() != null) {
                    if (resource.getCategory().equals("videos") || resource.getCategory().equals("audio")) {
                        resourceType = "video";
                    } else if (resource.getCategory().equals("documents")) {
                        resourceType = "raw";
                    }
                }
                cloudinary.uploader().destroy(resource.getPublicId(), ObjectUtils.asMap("resource_type", resourceType));
                log.info("Deleted file from Cloudinary: {}", resource.getPublicId());
            } catch (IOException e) {
                log.error("Error deleting file from Cloudinary: {}", e.getMessage());
            }
        }

        resourceRepository.delete(resource);
    }
}
