package vn.edu.iuh.fit.ott_education_be.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.iuh.fit.ott_education_be.model.GroupNote;
import vn.edu.iuh.fit.ott_education_be.model.User;
import vn.edu.iuh.fit.ott_education_be.service.GroupNoteService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/group-notes")
@RequiredArgsConstructor
public class GroupNoteController {
    private final GroupNoteService groupNoteService;

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<GroupNote>> getGroupNotes(@PathVariable String groupId) {
        return ResponseEntity.ok(groupNoteService.getGroupNotes(groupId));
    }

    @PostMapping
    public ResponseEntity<GroupNote> createNote(
            @RequestBody Map<String, Object> request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        String groupId = request.get("groupId").toString();
        String title = request.get("title").toString();
        String content = request.get("content").toString();

        GroupNote note = groupNoteService.createNote(groupId, title, content, user.getId());
        return ResponseEntity.ok(note);
    }

    @PutMapping("/{noteId}")
    public ResponseEntity<GroupNote> updateNote(
            @PathVariable String noteId,
            @RequestBody Map<String, String> request) {
        String title = request.get("title");
        String content = request.get("content");

        GroupNote note = groupNoteService.updateNote(noteId, title, content);
        return ResponseEntity.ok(note);
    }

    @DeleteMapping("/{noteId}")
    public ResponseEntity<Void> deleteNote(@PathVariable String noteId) {
        groupNoteService.deleteNote(noteId);
        return ResponseEntity.ok().build();
    }
}
