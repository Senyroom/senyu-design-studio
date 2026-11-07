UPDATE `Article` SET `published` = JSON_SET(`published`, '$.categoryId', `categoryId`, '$.sort', `sort`) WHERE `published` IS NOT NULL AND JSON_TYPE(`published`) = 'OBJECT';
