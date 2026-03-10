/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 */

package Tokenizer.src;

import java.io.File;
import java.io.IOException;
import java.util.List;

/**
 *

 @author jakes*/
public class JavaTokenizer {
    public JavaTokenizer() throws IOException{
        MultiLangTokenizer multi = new MultiLangTokenizer();
        List<Node> l = multi.tokenize("backend/testFiles/Test.c");
        for(Node n : l){
            System.out.println("Line Number: " + n.LineNumber + " Token: " + n.token.getText());
        }
    }

    public static void main(String[] args) throws IOException {
        JavaTokenizer j = new JavaTokenizer();
    }
}
