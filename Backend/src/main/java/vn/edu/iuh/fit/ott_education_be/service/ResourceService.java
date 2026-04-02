package vn.edu.iuh.fit.ott_education_be.service;

import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.ott_education_be.model.Resource;

import java.util.List;
import java.util.Map;

// Document management service contract used by the controller and implementation.

public interface ResourceService {
    List<Resource> getResourcesByUserId(String userId);

    List<Resource> getResourcesByUserIdAndCategory(String userId, String category);

    Resource getResourceById(String resourceId);

    Resource uploadResource(MultipartFile file, String userId, String folderId);

    Resource createFolder(String name, String parentId, String userId);

    void deleteResource(String resourceId, String userId);

    Resource shareResource(String resourceId, String targetId, String targetType, String userId);

    Map<String, Object> getStorageInfo(String userId);

    byte[] downloadResource(String resourceId, String userId);
}