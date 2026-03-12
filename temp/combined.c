===== BEGIN FILE: New folder/Test.c =====
#include <stdio.h>

int main()
{
    printf("hello, world\n");
}

// Compile, then run `./a.out 1>stdout.txt 2>stderr.txt`
// Then run `echo $?`
// stdout.txt should contain "hello, world"
// stderr.txt should be empty
// Your `echo $?` command should return 0
===== END FILE: New folder/Test.c =====

===== BEGIN FILE: New folder/Test2.c =====
#include <stdio.h>

int main()
{
    printf("hello, world\n");
    printf("hello, world2\n");
}

===== END FILE: New folder/Test2.c =====

