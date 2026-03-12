import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

public class Submission05 {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String text = sc.nextLine().toLowerCase();
        String[] words = text.replaceAll("[^a-z0-9 ]", " ").trim().split("\\s+");

        Map<String, Integer> freq = new HashMap<>();
        for (String w : words) {
            if (!w.isEmpty()) {
                freq.put(w, freq.getOrDefault(w, 0) + 1);
            }
        }

        for (String key : freq.keySet()) {
            System.out.println(key + ":" + freq.get(key));
        }
    }
}
