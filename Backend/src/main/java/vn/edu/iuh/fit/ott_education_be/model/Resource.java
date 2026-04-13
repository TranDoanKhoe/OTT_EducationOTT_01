package vn.edu.iuh.fit.ott_education_be.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Document(collection = "resources")
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class Resource {
    @Id
    private String id;
    
    @Indexed
    private String userId; // Owner of the resource
    
    private String name; // File/folder name
    private String fileName; // Original file name
    private String fileUrl; // URL to the file (Cloudinary or S3)
    private String publicId; // Public ID for cloud storage
    private String mimeType; // MIME type of the file
    private Long size; // File size in bytes
    private String category; // documents, images, videos, audio
    private String thumbnail; // Thumbnail URL for images/videos
    
    @JsonProperty("isFolder")
    private boolean isFolder; // Is this a folder?
    private String parentId; // Parent folder ID (null for root)
    
    private List<String> sharedWith; // List of user IDs this resource is shared with
    private List<String> sharedGroups; // List of group IDs this resource is shared with
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
