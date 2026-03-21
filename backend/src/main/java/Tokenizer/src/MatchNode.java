package Tokenizer.src;

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
}