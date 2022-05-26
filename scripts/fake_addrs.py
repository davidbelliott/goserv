import random
import sys

n = int(sys.argv[1])
alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
addrs = [''.join(random.choices(alphabet, k=44)) for i in range(0, n)]
print('\n'.join(addrs))
