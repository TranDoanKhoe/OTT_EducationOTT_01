package vn.edu.iuh.fit.ott_education_be.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import vn.edu.iuh.fit.ott_education_be.model.Poll;
import vn.edu.iuh.fit.ott_education_be.repository.PollRepository;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PollService {
    private final PollRepository pollRepository;

    public List<Poll> getGroupPolls(String groupId) {
        return pollRepository.findByGroupIdOrderByCreatedAtDesc(groupId);
    }

    public Poll createPoll(String groupId, String question, List<String> options, 
                          Boolean allowMultiple, String userId) {
        // Initialize empty votes for each option
        List<List<String>> votes = new ArrayList<>();
        for (int i = 0; i < options.size(); i++) {
            votes.add(new ArrayList<>());
        }

        Poll poll = Poll.builder()
                .groupId(groupId)
                .question(question)
                .options(options)
                .votes(votes)
                .allowMultiple(allowMultiple)
                .createdBy(userId)
                .build();
        poll.onCreate();
        return pollRepository.save(poll);
    }

    public Poll votePoll(String pollId, int optionIndex, String userId) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new RuntimeException("Poll not found"));

        List<List<String>> votes = poll.getVotes();

        // Check if user already voted
        boolean hasVoted = votes.stream().anyMatch(v -> v.contains(userId));

        if (poll.getAllowMultiple() || !hasVoted) {
            // Add vote if not already voted for this option
            if (!votes.get(optionIndex).contains(userId)) {
                votes.get(optionIndex).add(userId);
            }
        } else {
            // Remove previous vote and add new one
            for (int i = 0; i < votes.size(); i++) {
                votes.get(i).remove(userId);
            }
            votes.get(optionIndex).add(userId);
        }

        poll.setVotes(votes);
        return pollRepository.save(poll);
    }
}
