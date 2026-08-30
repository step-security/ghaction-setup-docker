FROM mcr.microsoft.com/windows/nanoserver:2009-KB4579311
COPY hello.txt C:
CMD ["cmd", "/C", "type C:\\hello.txt"]
