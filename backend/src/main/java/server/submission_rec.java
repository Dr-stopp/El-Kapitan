package server;

import java.io.File;

public class submission_rec {
    long submission_ID;
    String filePath;
    File file;

    public submission_rec(long submission_ID, String filePath) {
        this.submission_ID = submission_ID;
        this.filePath = filePath;
    }

    public submission_rec(long submission_ID, String filePath, File file) {
        this.submission_ID = submission_ID;
        this.filePath = filePath;
        this.file = file;
    }
}
