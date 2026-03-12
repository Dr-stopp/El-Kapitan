
package Tokenizer.src;

/**
 *

 @author jakes*/

public class KGram {

    public int hash;
    public int startLine;
    public int endLine;

    public KGram(int hash, int startLine, int endLine) {
        this.hash = hash;
        this.startLine = startLine;
        this.endLine = endLine;
    }
}