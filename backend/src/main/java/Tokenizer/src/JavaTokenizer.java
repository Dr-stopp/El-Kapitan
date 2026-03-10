/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 */

package Tokenizer.src;

import java.io.IOException;

/**
 *
 * @author jakes
 */
public class JavaTokenizer {

    public static void main(String[] args) throws IOException {
        MultiLangTokenizer tokenizer = new MultiLangTokenizer();
        tokenizer.tokenize("backend/testFiles/Test.java");
    }
}
