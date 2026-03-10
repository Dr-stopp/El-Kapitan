package Tokenizer.src;
import org.antlr.v4.runtime.*;

public class Node {
    int LineNumber;
    Token token;

    public Node(int l, Token t){
        LineNumber=l; token=t;
    }
}
