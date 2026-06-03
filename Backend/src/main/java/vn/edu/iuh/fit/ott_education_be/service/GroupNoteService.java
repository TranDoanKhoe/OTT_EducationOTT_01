package vn.edu.iuh.fit.ott_education_be.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.edu.iuh.fit.ott_education_be.model.GroupNote;
import vn.edu.iuh.fit.ott_education_be.repository.GroupNoteRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class GroupNoteService {
    private final GroupNoteRepository groupNoteRepository;

    public List<GroupNote> getGroupNotes(String groupId) {
        return groupNoteRepository.findByGroupIdOrderByCreatedAtDesc(groupId);
    }

    public GroupNote createNote(String groupId, String title, String content, String userId) {
        GroupNote note = GroupNote.builder()
                .groupId(groupId)
                .title(title)
                .content(content)
                .createdBy(userId)
                .build();
        note.onCreate();
        return groupNoteRepository.save(note);
    }

    public GroupNote updateNote(String noteId, String title, String content) {
        GroupNote note = groupNoteRepository.findById(noteId)
                .orElseThrow(() -> new RuntimeException("Note not found"));
        note.setTitle(title);
        note.setContent(content);
        note.onUpdate();
        return groupNoteRepository.save(note);
    }

    public void deleteNote(String noteId) {
        groupNoteRepository.deleteById(noteId);
    }
}
