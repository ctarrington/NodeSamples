DROP TABLE `account`;

CREATE TABLE `account` (
  `id` int(11) unsigned NOT NULL,
  `balance` double NOT NULL DEFAULT '0',
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;