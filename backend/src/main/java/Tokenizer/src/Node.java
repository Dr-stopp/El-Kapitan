package Tokenizer.src;
import org.antlr.v4.runtime.*;

public class Node {
    int LineNumber;
    Token token;
    String Identifier;

    public Node(int l, Token t, String s){
        LineNumber=l; token=t; Identifier =s;
    }
}
