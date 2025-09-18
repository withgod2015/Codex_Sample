#include <stdio.h>
#ifdef __EMSCRIPTEN__
#include <emscripten/emscripten.h>
#define KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define KEEPALIVE
#endif

KEEPALIVE
int add(int a, int b) {
    return a + b;
}

KEEPALIVE
int factorial(int n) {
    if (n < 0) {
        return 0;
    }

    int result = 1;
    for (int i = 2; i <= n; ++i) {
        result *= i;
    }
    return result;
}

int main(void) {
    puts("Hello from C running inside your browser!");
    puts("Use the UI controls to call factorial() and add().");
    return 0;
}
