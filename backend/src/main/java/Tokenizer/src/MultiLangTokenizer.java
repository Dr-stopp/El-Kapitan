/*
 * Click nbfs://nbhost/SystemFileSystem/Templates/Licenses/license-default.txt to change this license
 * Click nbfs://nbhost/SystemFileSystem/Templates/Classes/Class.java to edit this template
 */
package Tokenizer.src;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import org.antlr.v4.runtime.*;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.util.LinkedList;
import java.util.List;

public class MultiLangTokenizer {
    List<String> ignoredTokens = new LinkedList();

    public MultiLangTokenizer() throws FileNotFoundException, IOException{
        try (BufferedReader reader = new BufferedReader(new FileReader("backend/src/Main/resources/Ignore.txt"))) {
            String line = reader.readLine();
            while (line != null) {
                ignoredTokens.add(line);
                line = reader.readLine();
            }
        }
         
    }

    public List<Node> tokenize(String filePath) throws IOException {
        CharStream input = CharStreams.fromFileName(filePath);

        Lexer lexer = null;

        if (filePath.endsWith(".java")) {
            lexer = new JavaLexer(input);
        }
        else if (filePath.endsWith(".c")) {
            lexer = new CLexer(input);
        }
        else if (filePath.endsWith(".cpp")) {
            lexer = new CPP14Lexer(input);
        }
        else {
            throw new IllegalArgumentException("Unsupported file type");
        }

        Token token;
        List<Node> tokenList = new LinkedList();
        while ((token = lexer.nextToken()).getType() != Token.EOF) {
            if (token.getChannel() == Token.DEFAULT_CHANNEL) {

                String tokenName = lexer.getVocabulary().getSymbolicName(token.getType());

        int line = token.getLine();
        int column = token.getCharPositionInLine();
        int ignore =0;
        for(String s : ignoredTokens){
            if (tokenName.equals(s)){ ignore =1;break;}
        }
        if(ignore ==0){
            Node n = new Node(line,token,tokenName);
            tokenList.add(n);
        } 
        
    }
        }
        return tokenList;
    }



}
