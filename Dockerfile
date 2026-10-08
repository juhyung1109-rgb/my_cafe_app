FROM nginx:alpine

# Nginx 커스텀 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 웹 애플리케이션 파일 복사
COPY . /usr/share/nginx/html/

# Cloud Run 기본 포트
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
