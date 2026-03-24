package Tokenizer.src;

import java.util.List;

public class PlagarismResult {
    public double similarity;
    public List<MatchNode> matches;

    public PlagarismResult(double similarity, List<MatchNode> matches) {
        this.similarity = similarity;
        this.matches = matches;
    }
}
