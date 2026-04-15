package vn.edu.iuh.fit.ott_education_be.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.ott_education_be.model.Resource;
import vn.edu.iuh.fit.ott_education_be.repository.UserRepository;
import vn.edu.iuh.fit.ott_education_be.service.ResourceService;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j(topic = "RESOURCE-CONTROLLER")
@RequestMapping("/resources")
public class ResourceController {
    
    private final ResourceService resourceService;
    private final UserRepository userRepository;
    
    private String getCurrentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("Không tìm thấy thông tin xác thực");
        }
        return userRepository.findByUsername(authentication.getName()).getId();
    }
    
    @GetMapping("/list")
    public ResponseEntity<List<Resource>> getResources(
            @RequestParam(value = "category", defaultValue = "all") String category) {
        try {
            String userId = getCurrentUserId();
            log.info("Getting resources for user: {}, category: {}", userId, category);
            List<Resource> resources = resourceService.getResourcesByUserIdAndCategory(userId, category);
            return ResponseEntity.ok(resources);
        } catch (Exception e) {
            log.error("Error getting resources: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(List.of());
        }
    }
    
    @GetMapping("/{resourceId}")
    public ResponseEntity<Resource> getResource(@PathVariable String resourceId) {
        try {
            Resource resource = resourceService.getResourceById(resourceId);
            return ResponseEntity.ok(resource);
        } catch (Exception e) {
            log.error("Error getting resource: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(null);
        }
    }
    
    @PostMapping("/upload")
    public ResponseEntity<Resource> uploadResource(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "folderId", required = false) String folderId) {
        try {
            String userId = getCurrentUserId();
            log.info("Uploading resource for user: {}, file: {}, size: {}", 
                userId, file.getOriginalFilename(), file.getSize());
            Resource resource = resourceService.uploadResource(file, userId, folderId);
            return ResponseEntity.ok(resource);
        } catch (Exception e) {
            log.error("Error uploading resource: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    @PostMapping("/folder")
    public ResponseEntity<Resource> createFolder(@RequestBody Map<String, String> request) {
        try {
            String userId = getCurrentUserId();
            String name = request.get("name");
            String parentId = request.get("parentId");
            log.info("Creating folder for user: {}, name: {}", userId, name);
            Resource folder = resourceService.createFolder(name, parentId, userId);
            return ResponseEntity.ok(folder);
        } catch (Exception e) {
            log.error("Error creating folder: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    @DeleteMapping("/{resourceId}")
    public ResponseEntity<Map<String, String>> deleteResource(@PathVariable String resourceId) {
        try {
            String userId = getCurrentUserId();
            log.info("Deleting resource: {} for user: {}", resourceId, userId);
            resourceService.deleteResource(resourceId, userId);
            return ResponseEntity.ok(Map.of("message", "Đã xóa thành công"));
        } catch (Exception e) {
            log.error("Error deleting resource: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Lỗi khi xóa: " + e.getMessage()));
        }
    }
    
    @GetMapping("/download/{resourceId}")
    public ResponseEntity<byte[]> downloadResource(@PathVariable String resourceId) {
        try {
            String userId = getCurrentUserId();
            log.info("Downloading resource: {} for user: {}", resourceId, userId);
            
            Resource resource = resourceService.getResourceById(resourceId);
            byte[] data = resourceService.downloadResource(resourceId, userId);
            
            String fileName = resource.getFileName() != null ? resource.getFileName() : "download";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", fileName);
            headers.setContentLength(data.length);
            
            return new ResponseEntity<>(data, headers, HttpStatus.OK);
        } catch (Exception e) {
            log.error("Error downloading resource: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    @PostMapping("/share")
    public ResponseEntity<Resource> shareResource(@RequestBody Map<String, String> request) {
        try {
            String userId = getCurrentUserId();
            String resourceId = request.get("resourceId");
            String targetId = request.get("targetId");
            String targetType = request.get("targetType");
            log.info("Sharing resource: {} to {}: {}", resourceId, targetType, targetId);
            Resource resource = resourceService.shareResource(resourceId, targetId, targetType, userId);
            return ResponseEntity.ok(resource);
        } catch (Exception e) {
            log.error("Error sharing resource: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(null);
        }
    }
    
    @GetMapping("/storage")
    public ResponseEntity<Map<String, Object>> getStorageInfo() {
        try {
            String userId = getCurrentUserId();
            log.info("Getting storage info for user: {}", userId);
            Map<String, Object> info = resourceService.getStorageInfo(userId);
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            log.error("Error getting storage info: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("used", 0L, "total", 5L * 1024 * 1024 * 1024));
        }
    }
}
