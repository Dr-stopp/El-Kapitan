package Tokenizer.src;

import java.util.Objects;

public class MatchNode {
    public int file1Start;
    public int file1End;
    public int file2Start;
    public int file2End;

    public MatchNode(int f1s, int f1e, int f2s, int f2e) {
        this.file1Start = f1s;
        this.file1End = f1e;
        this.file2Start = f2s;
        this.file2End = f2e;
    }
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof MatchNode)) return false;
        MatchNode m = (MatchNode) o;
        return file1Start == m.file1Start &&
                file1End == m.file1End &&
                file2Start == m.file2Start &&
                file2End == m.file2End;
    }

    @Override
    public int hashCode() {
        return Objects.hash(file1Start, file1End, file2Start, file2End);
    }
}