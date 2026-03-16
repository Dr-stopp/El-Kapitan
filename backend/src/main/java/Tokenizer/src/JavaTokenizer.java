/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 */

package Tokenizer.src;

import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.util.LinkedList;
import java.util.List;

/**
 *

 @author jakes*/
public class JavaTokenizer {
    List<KGram> kGrams;
    public JavaTokenizer(File f) throws IOException{
        MultiLangTokenizer multi = new MultiLangTokenizer();
        LoggerFactory.getLogger(String.valueOf(f));
        List<Node> l =multi.tokenize(String.valueOf(f));
        kGrams = generateKGrams(l);
    }

    public List<KGram> generateKGrams(List<Node> tokens) {

        int k = 5;
        List<KGram> result = new LinkedList<>();

        if (tokens.size() < k) {
            return result;
        }

        int numKgrams = tokens.size() - k + 1;

        for (int i = 0; i < numKgrams; i++) {

            StringBuilder gram = new StringBuilder();
            for (int j = 0; j < k; j++) {
                gram.append(tokens.get(i + j).Identifier).append(" ");
            }

            int startLine = tokens.get(i).LineNumber;
            int endLine = tokens.get(i + k - 1).LineNumber;

            int hash = gram.toString().trim().hashCode();

            result.add(new KGram(hash, startLine, endLine));
        }

        return result;
    }
}
