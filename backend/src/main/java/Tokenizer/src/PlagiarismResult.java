package Tokenizer.src;

import java.util.List;

public class PlagiarismResult {
    public double similarity;
    public List<MatchNode> matches;

    public PlagiarismResult(double similarity, List<MatchNode> matches) {
        this.similarity = similarity;
        this.matches = matches;
    }
}
