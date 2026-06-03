package vn.edu.iuh.fit.ott_education_be.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import vn.edu.iuh.fit.ott_education_be.model.Poll;
import vn.edu.iuh.fit.ott_education_be.model.User;
import vn.edu.iuh.fit.ott_education_be.service.PollService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/polls")
@RequiredArgsConstructor
public class PollController {
    private final PollService pollService;

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<Poll>> getGroupPolls(@PathVariable String groupId) {
        return ResponseEntity.ok(pollService.getGroupPolls(groupId));
    }

    @PostMapping
    public ResponseEntity<Poll> createPoll(
            @RequestBody Map<String, Object> request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        String groupId = request.get("groupId").toString();
        String question = request.get("question").toString();
        @SuppressWarnings("unchecked")
        List<String> options = (List<String>) request.get("options");
        Boolean allowMultiple = (Boolean) request.get("allowMultiple");

        Poll poll = pollService.createPoll(groupId, question, options, allowMultiple, user.getId());
        return ResponseEntity.ok(poll);
    }

    @PostMapping("/{pollId}/vote")
    public ResponseEntity<Poll> votePoll(
            @PathVariable String pollId,
            @RequestBody Map<String, Integer> request,
            Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        int optionIndex = request.get("optionIndex");

        Poll poll = pollService.votePoll(pollId, optionIndex, user.getId());
        return ResponseEntity.ok(poll);
    }
}
