FROM node:20

RUN npm install -g forever

USER root
COPY entrypoint.sh /entrypoint.sh
RUN chmod a+x /entrypoint.sh
ENTRYPOINT [ "/entrypoint.sh" ]

EXPOSE 3000
CMD [ "init" ]