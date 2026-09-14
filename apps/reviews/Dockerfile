FROM python:3.14.2-alpine AS build
WORKDIR /install
COPY apps/reviews/requirements.txt ./
RUN pip install --no-cache-dir --prefix=/install/target -r requirements.txt
FROM python:3.14.2-alpine
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PYTHONPATH=/app/vendor/lib/python3.14/site-packages
COPY --from=build /install/target ./vendor
COPY apps/reviews/main.py apps/reviews/telemetry.py ./
ARG SOURCE_REVISION=unknown
ENV SOURCE_REVISION=${SOURCE_REVISION}
USER 10001:10001
EXPOSE 8080
CMD ["python", "main.py"]
